import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import type { AccountIdentity } from '@perdiu/contracts'
import type { AuthGateway } from '../../src/models/auth/session.js'
import { ShellPresenter } from '../../src/presenters/app/shell.presenter.js'
import { AuthPresenter, signedOutNotice } from '../../src/presenters/auth/auth.presenter.js'

const identity: AccountIdentity = { id: 'account-1', email: 'persona@example.test' }

function setup(options: { session?: boolean; revokeFails?: boolean } = {}) {
  let restore!: (value: { session: boolean }) => void
  let expire: (() => void) | undefined
  const restored = new Promise<{ session: boolean }>((resolve) => {
    restore = resolve
  })
  const gateway: AuthGateway = {
    restore: () => restored,
    onSignedOut: (listener) => {
      expire = listener
      return () => {}
    },
    signIn: async () => {},
    signUp: async () => 'confirmation_sent',
    resendConfirmation: async () => {},
    signOut: async () => {},
  }
  let revokeFails = options.revokeFails ?? false
  const auth = new AuthPresenter(gateway, {
    me: async () => identity,
    revokeSession: async () => {
      if (revokeFails) throw new Error('network')
    },
  })
  const events: string[] = []
  let restoredListener: (() => void) | undefined
  const shell = new ShellPresenter({
    auth,
    notices: { show: (message, error = false) => events.push((error ? 'error:' : '') + message) },
    effects: {
      scrollToTop: () => events.push('scroll'),
      onPageRestored: (listener) => {
        restoredListener = listener
        return () => {
          restoredListener = undefined
        }
      },
      reload: () => events.push('reload'),
    },
    onSignedOut: () => events.push('clear-private-data'),
  })
  const stop = shell.start()
  const finishRestore = async () => {
    restore({ session: options.session ?? false })
    await auth.start()
  }
  return {
    auth,
    shell,
    events,
    stop,
    finishRestore,
    expire: () => expire?.(),
    restorePage: () => restoredListener?.(),
    allowRevoke: () => {
      revokeFails = false
    },
  }
}

test('una sección privada sin sesión abre el ingreso y, al ingresar, se llega a ella', async () => {
  const { auth, shell, finishRestore, events } = setup()
  await finishRestore()
  shell.navigate('publish')
  assert.deepEqual(
    { ...shell.getSnapshot() },
    {
      section: 'overview',
      authView: 'login',
      pendingSection: 'publish',
      menuOpen: false,
      signingOut: false,
    },
  )
  await auth.signIn({ email: identity.email, password: 'Correcta-123' })
  assert.equal(shell.getSnapshot().section, 'publish')
  assert.equal(shell.getSnapshot().authView, null)
  assert.equal(shell.view().title, 'Publicar reporte')
  assert.deepEqual(shell.view().account, {
    name: 'persona',
    email: 'persona@example.test',
  })
  assert.deepEqual(events, [])
})

test('mientras se verifica la sesión la sección privada espera y luego pide ingresar', async () => {
  const { shell, finishRestore } = setup()
  shell.navigate('my-reports')
  assert.equal(shell.getSnapshot().section, 'my-reports')
  assert.equal(shell.view().access, 'wait')
  assert.equal(shell.view().restoring, true)
  await finishRestore()
  assert.equal(shell.getSnapshot().authView, 'login')
  assert.equal(shell.getSnapshot().pendingSection, 'my-reports')
  assert.equal(shell.getSnapshot().section, 'overview')
})

test('si la sesión vence se pide ingresar y volver atrás lleva al catálogo', async () => {
  const { shell, finishRestore, expire } = setup({ session: true })
  await finishRestore()
  shell.navigate('saved')
  expire()
  assert.equal(shell.getSnapshot().authView, 'login', 'el aviso de vencimiento abre el ingreso')
  assert.equal(shell.view().authNotice, 'Tu sesión venció o ya no es válida. Ingresa nuevamente.')
  shell.closeAuth()
  assert.deepEqual(
    { section: shell.getSnapshot().section, authView: shell.getSnapshot().authView },
    { section: 'explore', authView: null },
  )
})

test('cerrar sesión informa un fallo sin salir y, si funciona, limpia datos privados', async () => {
  const { shell, finishRestore, events, allowRevoke } = setup({ session: true, revokeFails: true })
  await finishRestore()
  shell.navigate('profile')
  await shell.signOut()
  assert.equal(shell.getSnapshot().section, 'profile')
  allowRevoke()
  const closing = shell.signOut()
  assert.equal(shell.getSnapshot().signingOut, true)
  await closing
  assert.deepEqual(
    { ...shell.getSnapshot() },
    {
      section: 'explore',
      authView: null,
      pendingSection: null,
      menuOpen: false,
      signingOut: false,
    },
  )
  assert.deepEqual(events, [
    'scroll',
    'error:No se pudo cerrar la sesión. Intenta nuevamente.',
    'clear-private-data',
    signedOutNotice,
  ])
})

test('navegar cierra el menú móvil y una página restaurada desde caché se recarga', async () => {
  const { shell, events, restorePage, stop } = setup()
  shell.openMenu()
  assert.equal(shell.getSnapshot().menuOpen, true)
  shell.navigate('explore')
  assert.equal(shell.getSnapshot().menuOpen, false)
  shell.openAuth('register')
  assert.deepEqual(
    { authView: shell.getSnapshot().authView, pending: shell.getSnapshot().pendingSection },
    { authView: 'register', pending: null },
  )
  restorePage()
  stop()
  restorePage()
  assert.deepEqual(events, ['scroll', 'reload'])
})
