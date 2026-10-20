import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { AuthFormPresenter } from '../../src/presenters/auth/auth-form.presenter.js'
import type { FormResult } from '../../src/presenters/auth/auth.presenter.js'

function auth(result: FormResult = { ok: true }) {
  const calls: unknown[] = []
  let finish!: () => void
  const gate = new Promise<void>((resolve) => {
    finish = resolve
  })
  return {
    calls,
    finish,
    actions: {
      signIn: async (input: unknown) => {
        calls.push(['signIn', input])
        await gate
        return result
      },
      signUp: async (input: unknown) => {
        calls.push(['signUp', input])
        await gate
        return result
      },
      resendConfirmation: async (email: string) => {
        calls.push(['resend', email])
        return email === 'falla@example.test' ? 'Servicio caído.' : undefined
      },
    },
  }
}

test('iniciar sesión envía lo escrito, bloquea un segundo envío y limpia la contraseña al terminar', async () => {
  const session = auth()
  const form = new AuthFormPresenter('login', session.actions)
  form.setEmail(' persona@example.test ')
  form.setPassword('Correcta-123')
  form.togglePassword()
  const pending = form.submit()
  assert.equal(form.getSnapshot().pending, true)
  await form.submit()
  session.finish()
  await pending
  assert.deepEqual(session.calls, [
    ['signIn', { email: ' persona@example.test ', password: 'Correcta-123' }],
  ])
  assert.deepEqual(form.getSnapshot(), {
    email: ' persona@example.test ',
    password: '',
    confirmPassword: '',
    showPassword: true,
    pending: false,
    errors: {},
    message: '',
    sentTo: '',
    resendStatus: '',
  })
})

test('los errores de campo y el mensaje del servicio se muestran sin perder lo escrito', async () => {
  const session = auth({
    ok: false,
    fieldErrors: { email: 'Ingresa un correo electrónico válido.' },
    message: 'Correo o contraseña incorrectos.',
  })
  const form = new AuthFormPresenter('login', session.actions)
  form.setEmail('persona')
  form.setPassword('x')
  session.finish()
  await form.submit()
  const state = form.getSnapshot()
  assert.deepEqual(state.errors, { email: 'Ingresa un correo electrónico válido.' })
  assert.equal(state.message, 'Correo o contraseña incorrectos.')
  assert.equal(state.password, 'x')
  assert.equal(state.pending, false)
})

test('el registro pide confirmar el correo y permite reenviar el enlace', async () => {
  const session = auth({ ok: true, confirmationSent: true })
  const form = new AuthFormPresenter('register', session.actions)
  form.setEmail(' nueva@example.test ')
  form.setPassword('Segura-123')
  form.setConfirmPassword('Segura-123')
  session.finish()
  await form.submit()
  assert.deepEqual(session.calls[0], [
    'signUp',
    { email: ' nueva@example.test ', password: 'Segura-123', confirmPassword: 'Segura-123' },
  ])
  assert.equal(form.getSnapshot().sentTo, 'nueva@example.test')
  assert.equal(form.getSnapshot().confirmPassword, '')
  const resending = form.resend()
  assert.equal(form.getSnapshot().resendStatus, 'Enviando…')
  await resending
  assert.equal(
    form.getSnapshot().resendStatus,
    'Si el correo puede registrarse, enviamos un nuevo enlace.',
  )
  assert.deepEqual(session.calls[1], ['resend', 'nueva@example.test'])
})

test('si el reenvío falla se informa el motivo seguro', async () => {
  const session = auth({ ok: true, confirmationSent: true })
  const form = new AuthFormPresenter('register', session.actions)
  form.setEmail('falla@example.test')
  session.finish()
  await form.submit()
  await form.resend()
  assert.equal(form.getSnapshot().resendStatus, 'Servicio caído.')
})
