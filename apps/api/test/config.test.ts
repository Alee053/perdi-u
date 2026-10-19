import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { readConfig } from '../src/config.js'

const databaseUrl = 'postgresql://test-user@127.0.0.1:5433/perdiu_test'
const auth = {
  AUTH_JWKS_URL: 'http://127.0.0.1:9999/.well-known/jwks.json',
  AUTH_JWT_ISSUER: 'http://localhost:5173/auth',
}

test('puerto inválido falla y una configuración válida conserva opciones explícitas', () => {
  assert.throws(() => readConfig({ DATABASE_URL: databaseUrl, ...auth, PORT: 'NaN' }), {
    message: 'PORT debe ser un entero entre 1 y 65535.',
  })
  assert.deepEqual(readConfig({ DATABASE_URL: databaseUrl, ...auth, PORT: '3001' }), {
    databaseUrl,
    port: 3001,
    host: '127.0.0.1',
    auth: {
      jwksUrl: auth.AUTH_JWKS_URL,
      issuer: auth.AUTH_JWT_ISSUER,
      audience: 'authenticated',
    },
  })
})

test('la verificación de sesiones exige claves públicas y emisor de Auth sin aceptar secretos', () => {
  const message =
    'AUTH_JWKS_URL y AUTH_JWT_ISSUER deben ser URLs http(s) de Supabase Auth, sin credenciales.'
  for (const env of [
    {},
    { AUTH_JWT_ISSUER: auth.AUTH_JWT_ISSUER },
    { AUTH_JWKS_URL: auth.AUTH_JWKS_URL },
    { ...auth, AUTH_JWKS_URL: 'file:///etc/jwks.json' },
    { ...auth, AUTH_JWKS_URL: 'http://admin:jwt-secret-sentinel@127.0.0.1:9999/jwks' },
  ])
    assert.throws(() => readConfig({ DATABASE_URL: databaseUrl, ...env }), { message })
  assert.equal(
    readConfig({ DATABASE_URL: databaseUrl, ...auth, AUTH_JWT_AUDIENCE: 'perdiu' }).auth.audience,
    'perdiu',
  )
})
