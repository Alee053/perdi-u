import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { parseOwnReportQuery } from '../src/reports/query.js'

test('la lista propia acepta solo un filtro opcional de estado y nunca otro propietario', () => {
  assert.deepEqual(parseOwnReportQuery({}), {})
  assert.deepEqual(parseOwnReportQuery({ state: 'active' }), { state: 'active' })
  assert.deepEqual(parseOwnReportQuery({ state: 'resolved' }), { state: 'resolved' })
  for (const input of [
    { state: 'all' },
    { state: '' },
    { state: ['active', 'resolved'] },
    { state: { value: 'active' } },
    { ownerId: 'other' },
    { q: 'texto' },
  ])
    assert.throws(() => parseOwnReportQuery(input), /Parámetros de mis reportes inválidos/)
})
