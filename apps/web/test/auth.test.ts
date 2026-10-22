import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import type { AccountIdentity } from '@perdiu/contracts'
import {
  AuthGatewayError,
  SessionRejected,
  type AccountClient,
  type AuthGateway,
} from '../src/models/auth/session.js'
import { AuthPresenter } from '../src/presenters/auth/auth.presenter.js'
import { createAccountClient } from '../src/infrastructure/http/account-client.js'

const identity: AccountIdentity = {
  id: '66068112-224a-4d11-a6cd-c18bdd1ffb1b',
  email: 'persona@example.test',
}

function doubles(
  overrides: Partial<AuthGateway> = {},
  account?: AccountClient['me'],
  revoke?: AccountClient['revokeSession'],
) {
  const calls: string[] = []
  let signedOut: (() => void) | undefined
  const gateway: AuthGateway = {
    restore: async () => ({ session: false }),
    onSignedOut: (listener) => {
      signedOut = listener
      return () => {
        signedOut = undefined
      }
    },
    signIn: async (email) => {
      calls.push(`signIn:${email}`)
    },
    signUp: async () => 'confirmation_sent',
    resendConfirmation: async () => {},
    signOut: async () => {
      calls.push('signOut')
    },
    ...overrides,
  }
  const presenter = new AuthPresenter(gateway, {
    me: account ?? (async () => identity),
    revokeSession:
      revoke ??
      (async () => {
        calls.push('revoke')
      }),
  })
  return { presenter, calls, expire: () => signedOut?.() }
}

test('iniciar sesión valida campos, autentica con Auth y usa la identidad verificada por la API', async () => {
  const { presenter, calls } = doubles()
  assert.deepEqual(await presenter.signIn({ email: 'no-es-correo', password: '' }), {
    ok: false,
    fieldErrors: {
      email: 'Ingresa un correo electrónico válido.',
      password: 'Ingresa tu contraseña.',
    },
  })
  assert.deepEqual(calls, [], 'no se envían credenciales inválidas')

  assert.deepEqual(
    await presenter.signIn({ email: '  Persona@Example.test ', password: 'Correcta-123' }),
    { ok: true },
  )
  assert.deepEqual(calls, ['signIn:persona@example.test'])
  assert.deepEqual(presenter.getSnapshot(), { status: 'authenticated', user: identity })
})

test('un rechazo de una ruta privada invalida la vista de sesión y vuelve a solicitar ingreso', async () => {
  const { presenter } = doubles()
  await presenter.signIn({ email: identity.email, password: 'Correcta-123' })
  presenter.requireSignIn()
  assert.equal(presenter.getSnapshot().status, 'anonymous')
  assert.equal(presenter.access('my-reports'), 'login')
})

test('credenciales incorrectas o Auth caído muestran mensajes seguros sin autenticar', async () => {
  for (const [reason, message] of [
    ['invalid_credentials', 'Correo o contraseña incorrectos.'],
    ['email_not_confirmed', 'Confirma tu correo antes de ingresar. Revisa tu bandeja de entrada.'],
    ['invalid_input', 'Revisa el correo y la contraseña e intenta nuevamente.'],
    ['rate_limited', 'Demasiados intentos. Espera unos minutos e intenta nuevamente.'],
    ['unavailable', 'No se pudo conectar con el servicio de acceso. Intenta nuevamente.'],
  ] as const) {
    const { presenter } = doubles({
      signIn: async () => {
        throw new AuthGatewayError(reason)
      },
    })
    await presenter.start()
    assert.deepEqual(
      await presenter.signIn({ email: 'persona@example.test', password: 'Incorrecta-1' }),
      { ok: false, fieldErrors: {}, message },
    )
    assert.equal(presenter.getSnapshot().status, 'anonymous')
  }
  const { presenter } = doubles({}, async () => {
    throw new SessionRejected()
  })
  const result = await presenter.signIn({ email: 'persona@example.test', password: 'Correcta-123' })
  assert.equal(result.ok, false)
  assert.equal(presenter.getSnapshot().status, 'anonymous', 'la API también debe aceptar el token')
})

test('el registro valida contraseña y confirmación y espera la verificación del correo', async () => {
  const registered: string[] = []
  const { presenter } = doubles({
    signUp: async (email) => {
      registered.push(email)
      return 'confirmation_sent'
    },
  })
  await presenter.start()
  assert.deepEqual(
    await presenter.signUp({ email: 'persona', password: 'corta', confirmPassword: 'otra' }),
    {
      ok: false,
      fieldErrors: {
        email: 'Ingresa un correo electrónico válido.',
        password: 'Usa al menos 8 caracteres.',
        confirmPassword: 'Las contraseñas no coinciden.',
      },
    },
  )
  assert.deepEqual(
    (await presenter.signUp({
      email: 'persona@example.test',
      password: 'x'.repeat(73),
      confirmPassword: 'x'.repeat(73),
    })) as { fieldErrors: object },
    { ok: false, fieldErrors: { password: 'Usa como máximo 72 caracteres.' } },
  )
  assert.deepEqual(registered, [])

  const valid = { email: 'Persona@example.test', password: 'Correcta-123' }
  assert.deepEqual(await presenter.signUp({ ...valid, confirmPassword: valid.password }), {
    ok: true,
    confirmationSent: true,
  })
  assert.deepEqual(registered, ['persona@example.test'])
  assert.equal(presenter.getSnapshot().status, 'anonymous', 'sin confirmar no hay sesión')
})

test('si Auth confirma automáticamente, el registro deja la cuenta autenticada', async () => {
  const { presenter } = doubles({ signUp: async () => 'signed_in' })
  assert.deepEqual(
    await presenter.signUp({
      email: 'persona@example.test',
      password: 'Correcta-123',
      confirmPassword: 'Correcta-123',
    }),
    { ok: true },
  )
  assert.deepEqual(presenter.getSnapshot(), { status: 'authenticated', user: identity })
  const failing = doubles({
    signUp: async () => {
      throw new AuthGatewayError('weak_password')
    },
  })
  assert.deepEqual(
    await failing.presenter.signUp({
      email: 'persona@example.test',
      password: 'Correcta-123',
      confirmPassword: 'Correcta-123',
    }),
    {
      ok: false,
      fieldErrors: {},
      message: 'La contraseña no cumple los requisitos. Usa al menos 8 caracteres.',
    },
  )
})

test('al recargar se restaura la sesión verificada; un token rechazado se descarta', async () => {
  const restored = doubles({ restore: async () => ({ session: true }) })
  assert.deepEqual(restored.presenter.getSnapshot(), { status: 'restoring' })
  await restored.presenter.start()
  assert.deepEqual(restored.presenter.getSnapshot(), { status: 'authenticated', user: identity })

  const rejected = doubles({ restore: async () => ({ session: true }) }, async () => {
    throw new SessionRejected()
  })
  await rejected.presenter.start()
  assert.deepEqual(rejected.presenter.getSnapshot(), {
    status: 'anonymous',
    notice: 'Tu sesión venció o ya no es válida. Ingresa nuevamente.',
  })
  assert.deepEqual(rejected.calls, ['signOut'], 'la sesión local inválida se elimina')
})

test('si la sesión vence, se vuelve al estado anónimo y las secciones privadas piden ingresar', async () => {
  const { presenter, expire } = doubles({ restore: async () => ({ session: true }) })
  assert.equal(presenter.access('my-reports'), 'wait')
  await presenter.start()
  assert.equal(presenter.access('my-reports'), 'allow')
  expire()
  assert.deepEqual(presenter.getSnapshot(), {
    status: 'anonymous',
    notice: 'Tu sesión venció o ya no es válida. Ingresa nuevamente.',
  })
  for (const section of ['publish', 'my-reports'] as const)
    assert.equal(presenter.access(section), 'login')
  // Saved reports are a list on this device, available without an account.
  for (const section of ['overview', 'explore', 'map', 'saved', 'safety'] as const)
    assert.equal(presenter.access(section), 'allow')
})

test('cerrar sesión elimina la identidad; si falla, la sesión sigue y se informa el error', async () => {
  let fail = true
  const { presenter, calls } = doubles({
    restore: async () => ({ session: true }),
    signOut: async () => {
      calls.push('signOut')
      if (fail) throw new AuthGatewayError('unavailable')
    },
  })
  await presenter.start()
  assert.equal(await presenter.signOut(), 'No se pudo cerrar la sesión. Intenta nuevamente.')
  assert.deepEqual(presenter.getSnapshot(), { status: 'authenticated', user: identity })
  fail = false
  assert.equal(await presenter.signOut(), undefined)
  assert.deepEqual(presenter.getSnapshot(), {
    status: 'anonymous',
    notice: 'Cerraste sesión correctamente.',
  })
  assert.deepEqual(calls, ['revoke', 'signOut', 'revoke', 'signOut'], 'primero la API, luego Auth')
})

test('si la API no revoca la sesión, Auth no se cierra y no se anuncia el cierre', async () => {
  const { presenter, calls } = doubles(
    { restore: async () => ({ session: true }) },
    undefined,
    async () => {
      throw new Error('No se pudo cerrar la sesión.')
    },
  )
  await presenter.start()
  assert.equal(await presenter.signOut(), 'No se pudo cerrar la sesión. Intenta nuevamente.')
  assert.deepEqual(presenter.getSnapshot(), { status: 'authenticated', user: identity })
  assert.deepEqual(calls, [], 'la sesión de Auth sigue abierta mientras la API la acepte')
})

test('el cliente de cuenta envía el access token y traduce un 401 en sesión rechazada', async () => {
  const requests: { url: string; authorization: string | null; credentials?: string }[] = []
  let status = 200
  let body: unknown = { ...identity, phone: 'private-sentinel' }
  const fetcher = (async (url: string, init: RequestInit) => {
    requests.push({
      url,
      authorization: new Headers(init.headers).get('authorization'),
      credentials: init.credentials,
    })
    return new Response(JSON.stringify(body), { status })
  }) as typeof fetch
  let token: string | undefined = 'access-token'
  const client = createAccountClient('/api/', async () => token, fetcher)

  assert.deepEqual(await client.me(), identity)
  assert.deepEqual(requests, [
    { url: '/api/me', authorization: 'Bearer access-token', credentials: 'omit' },
  ])
  status = 401
  await assert.rejects(client.me(), SessionRejected)
  status = 200
  body = { id: identity.id }
  await assert.rejects(client.me(), (error) => !(error instanceof SessionRejected))
  token = undefined
  await assert.rejects(client.me(), SessionRejected)
  assert.equal(requests.length, 3, 'sin token no hay petición')
})

test('al volver del enlace de confirmación se informa el resultado sin crear una sesión simulada', async () => {
  const confirmed = doubles({ restore: async () => ({ session: false, link: 'confirmed' }) })
  await confirmed.presenter.start()
  assert.deepEqual(confirmed.presenter.getSnapshot(), {
    status: 'anonymous',
    notice: 'Tu correo está confirmado. Inicia sesión para continuar.',
  })
  const invalid = doubles({ restore: async () => ({ session: false, link: 'invalid' }) })
  await invalid.presenter.start()
  assert.deepEqual(invalid.presenter.getSnapshot(), {
    status: 'anonymous',
    notice: 'El enlace no es válido o ya venció. Inicia sesión o vuelve a registrarte.',
  })
  const signedIn = doubles({ restore: async () => ({ session: true, link: 'confirmed' }) })
  await signedIn.presenter.start()
  assert.deepEqual(signedIn.presenter.getSnapshot(), { status: 'authenticated', user: identity })
})

test('el cliente revoca la sesión en la API; un 401 ya no tiene nada que revocar', async () => {
  const requests: { url: string; method?: string; authorization: string | null }[] = []
  let status = 204
  let network = true
  const fetcher = (async (url: string, init: RequestInit) => {
    if (!network) throw new TypeError('fetch failed')
    requests.push({
      url,
      method: init.method,
      authorization: new Headers(init.headers).get('authorization'),
    })
    return new Response(null, { status })
  }) as typeof fetch
  let token: string | undefined = 'access-token'
  const client = createAccountClient('/api', async () => token, fetcher)

  await client.revokeSession()
  assert.deepEqual(requests, [
    { url: '/api/me/logout', method: 'POST', authorization: 'Bearer access-token' },
  ])
  status = 401
  await client.revokeSession()
  status = 503
  await assert.rejects(client.revokeSession())
  network = false
  await assert.rejects(client.revokeSession())
  network = true
  token = undefined
  await client.revokeSession()
  assert.equal(requests.length, 3, 'sin token no hay sesión que revocar')
})

test('el cliente conserva nombre y foto del perfil propio sin campos ajenos ni caché', async () => {
  const caches: (RequestCache | undefined)[] = []
  let body: unknown
  const fetcher = (async (_url: string, init: RequestInit) => {
    caches.push(init.cache)
    return new Response(JSON.stringify(body), { status: 200 })
  }) as typeof fetch
  const client = createAccountClient('/api', async () => 'access-token', fetcher)

  body = {
    ...identity,
    displayName: 'Persona Ficticia',
    photoUrl: 'https://images.example.test/persona.png',
    phone: 'private-sentinel',
  }
  assert.deepEqual(await client.me(), {
    ...identity,
    displayName: 'Persona Ficticia',
    photoUrl: 'https://images.example.test/persona.png',
  })
  body = { ...identity, displayName: '', photoUrl: 42 }
  assert.deepEqual(await client.me(), identity)
  assert.deepEqual(caches, ['no-store', 'no-store'])
})

test('«Mi perfil» exige sesión y al cambiar de cuenta solo queda la identidad actual', async () => {
  let current: AccountIdentity = { ...identity, displayName: 'Persona Ficticia' }
  const other: AccountIdentity = {
    id: '9b1f3c2e-5d4a-4e8b-a7c6-0f1e2d3c4b5a',
    email: 'otra@example.test',
    displayName: 'Otra Cuenta',
  }
  const { presenter } = doubles({}, async () => current)
  const credentials = { email: 'persona@example.test', password: 'Correcta-123' }
  assert.equal(presenter.access('profile'), 'wait')
  await presenter.start()
  assert.equal(presenter.access('profile'), 'login', 'sin sesión se pide ingresar')

  await presenter.signIn(credentials)
  assert.equal(presenter.access('profile'), 'allow')
  assert.deepEqual(presenter.getSnapshot(), { status: 'authenticated', user: current })
  assert.equal(await presenter.signOut(), undefined)
  assert.equal(presenter.access('profile'), 'login', 'tras cerrar sesión ya no se muestra')

  current = other
  await presenter.signIn({ ...credentials, email: other.email })
  assert.deepEqual(presenter.getSnapshot(), { status: 'authenticated', user: other })
})
