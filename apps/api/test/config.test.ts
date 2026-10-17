import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { readConfig } from '../src/config.js'

test('puerto inválido falla y una configuración válida conserva opciones explícitas', () => {
  const databaseUrl = 'postgresql://test-user@127.0.0.1:5433/perdiu_test'
  assert.throws(() => readConfig({ DATABASE_URL: databaseUrl, PORT: 'NaN' }), {
    message: 'PORT debe ser un entero entre 1 y 65535.',
  })
  assert.deepEqual(readConfig({ DATABASE_URL: databaseUrl, PORT: '3001' }), {
    databaseUrl,
    port: 3001,
    host: '127.0.0.1',
  })
})
