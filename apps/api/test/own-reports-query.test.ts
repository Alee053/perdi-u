import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { parseOwnReportQuery } from '../src/reports/query.js'

test('el historial privado admite solo un estado válido, nunca una identidad del cliente', () => {
  assert.deepEqual(parseOwnReportQuery({}), {})
  assert.deepEqual(parseOwnReportQuery({ state: 'active' }), { state: 'active' })
  assert.deepEqual(parseOwnReportQuery({ state: 'resolved' }), { state: 'resolved' })
  for (const input of [
    { ownerId: 'someone-else' },
    { state: 'all' },
    { state: ['active', 'resolved'] },
    { state: { value: 'active' } },
    { state: '' },
  ])
    assert.throws(() => parseOwnReportQuery(input), /Parámetros de mis reportes inválidos/)
})
