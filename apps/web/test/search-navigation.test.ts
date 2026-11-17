import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { readSearchPath, searchPath } from '../src/infrastructure/browser/search-navigation.js'

test('un enlace restaura los siete filtros y los representa sin valores vacíos ni datos privados', () => {
  const path =
    '/?q=C%C3%A1mara+%26+libros&type=found&category=object&city=Tarija&zone=San+Jos%C3%A9&dateFrom=2026-10-01&dateTo=2026-10-31'
  const query = {
    q: 'Cámara & libros',
    type: 'found' as const,
    category: 'object' as const,
    city: 'Tarija',
    zone: 'San José',
    dateFrom: '2026-10-01',
    dateTo: '2026-10-31',
  }
  assert.deepEqual(readSearchPath(path), { query, invalid: false })
  assert.equal(searchPath({ ...query, ownerId: 'private', token: 'private' } as typeof query), path)
  assert.equal(searchPath({ q: '  ', city: '', zone: ' ' }), '/')
  assert.deepEqual(readSearchPath('/'), { query: {}, invalid: false })
})

test('los filtros inválidos, repetidos o desconocidos se detectan sin reenviar identidad ni destinos', () => {
  const invalid = [
    [
      ['q', 'uno'],
      ['q', 'dos'],
    ],
    [
      ['category', 'object'],
      ['category', 'object'],
    ],
    [['type', 'LOST']],
    [['category', 'other']],
    [['q', 'x'.repeat(201)]],
    [['zone', 'x'.repeat(201)]],
    [['city', 'x'.repeat(101)]],
    [['q', 'texto\nprivado']],
    [['zone', '\u0000']],
    [['dateFrom', '2026-02-29']],
    [['dateTo', '0000-01-01']],
    [['dateFrom', '2026-1-01']],
    [['dateFrom', ' 2026-10-01']],
    [
      ['dateFrom', '2026-10-20'],
      ['dateTo', '2026-10-01'],
    ],
    [
      ['dateTo', '2026-10-01'],
      ['dateTo', '2026-10-02'],
    ],
    [['ownerId', 'private-sentinel']],
    [['token', 'private-sentinel']],
    [['redirect', 'https://external.test/private-sentinel']],
    [['q[]', 'private-sentinel']],
    [['__proto__', 'private-sentinel']],
  ]
  for (const entries of invalid) {
    const result = readSearchPath('/?' + new URLSearchParams(entries))
    assert.equal(result?.invalid, true, JSON.stringify(entries))
    assert.ok(!JSON.stringify(result).includes('private-sentinel'))
  }
  assert.deepEqual(readSearchPath('/?q=camara&type=other'), {
    query: { q: 'camara' },
    invalid: true,
  })
  assert.deepEqual(readSearchPath('/?q=uno&q=dos'), { query: {}, invalid: true })
  assert.deepEqual(readSearchPath('/?dateFrom=2024-02-29'), {
    query: { dateFrom: '2024-02-29' },
    invalid: false,
  })
  assert.equal(readSearchPath('https://external.test/?q=camara'), undefined)
  assert.equal(readSearchPath('/reportes/one?q=camara'), undefined)
  const literal = '<img src=x onerror=alert(1)>'
  assert.deepEqual(readSearchPath(searchPath({ q: literal })), {
    query: { q: literal },
    invalid: false,
  })
  assert.ok(!searchPath({ q: literal }).includes('<'))
})
