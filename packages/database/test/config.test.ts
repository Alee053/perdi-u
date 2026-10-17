import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { assertLocalDatabase, readDatabaseUrl } from '../src/config.js'

test('la configuración ausente falla con diagnóstico seguro', () => {
  assert.throws(() => readDatabaseUrl({}), { message: 'DATABASE_URL es obligatoria.' })
})

test('una URL inválida falla sin reproducir su contenido', () => {
  for (const databaseUrl of [
    'private-config-sentinel',
    'https://example.invalid/db',
    'postgresql://localhost',
  ]) {
    assert.throws(() => readDatabaseUrl({ DATABASE_URL: databaseUrl }), {
      message: 'DATABASE_URL debe ser una URL PostgreSQL válida con usuario y base de datos.',
    })
  }
})

test('las operaciones de BD rechazan parámetros que pueden sustituir el destino local', () => {
  assert.doesNotThrow(() => assertLocalDatabase('postgresql://test-user@127.0.0.1/perdiu_dev'))
  for (const url of [
    'postgresql://test-user@remote.example.invalid/perdiu_dev',
    'postgresql://test-user@127.0.0.1/shared',
    'postgresql://test-user@127.0.0.1/perdiu_dev?host=remote.example.invalid',
    'postgresql://test-user@127.0.0.1/perdiu_dev?database=shared',
  ])
    assert.throws(() => assertLocalDatabase(url), {
      message:
        'Esta operación requiere una base PerdiU local terminada en dev o test, fuera de producción.',
    })
})

test('las operaciones de BD rechazan producción incluso con una URL local', () => {
  const previous = process.env.NODE_ENV
  try {
    process.env.NODE_ENV = 'production'
    assert.throws(() => assertLocalDatabase('postgresql://test-user@127.0.0.1/perdiu_dev'))
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previous
  }
})
