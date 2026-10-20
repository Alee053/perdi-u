import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import {
  normalizeEmail,
  validateSignIn,
  validateSignUp,
} from '../../src/models/auth/credentials.js'

test('el correo se normaliza antes de validarse y el ingreso exige contraseña', () => {
  assert.equal(normalizeEmail('  Persona@Example.TEST '), 'persona@example.test')
  assert.deepEqual(validateSignIn({ email: ' Persona@Example.test ', password: 'x' }), {})
  assert.deepEqual(validateSignIn({ email: 'sin-dominio@local', password: '' }), {
    email: 'invalid',
    password: 'required',
  })
})

test('el registro mide la contraseña en caracteres y bytes y exige confirmarla', () => {
  const valid = { email: 'persona@example.test', password: 'ñandú-123', confirmPassword: '' }
  assert.deepEqual(validateSignUp({ ...valid, confirmPassword: valid.password }), {})
  assert.deepEqual(validateSignUp({ ...valid, password: 'corta', confirmPassword: 'corta' }), {
    password: 'too_short',
  })
  const long = 'ñ'.repeat(37) // 37 caracteres, 74 bytes
  assert.deepEqual(validateSignUp({ ...valid, password: long, confirmPassword: long }), {
    password: 'too_long',
  })
  assert.deepEqual(validateSignUp(valid), { confirmPassword: 'mismatch' })
})
