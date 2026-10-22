import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { BadRequestException } from '@nestjs/common'
import { parseReportId } from '../src/reports/query.js'

test('el ID de un reporte se acepta solo como UUID y se normaliza en minúsculas', () => {
  assert.equal(
    parseReportId('20000000-0000-0000-0000-000000000001'),
    '20000000-0000-0000-0000-000000000001',
  )
  assert.equal(
    parseReportId('ABCDEF00-0000-4000-8000-0000000000AA'),
    'abcdef00-0000-4000-8000-0000000000aa',
  )
  for (const input of [
    '',
    'reporte-1',
    '20000000-0000-0000-0000-00000000000',
    ' 20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001/contact',
    '20000000-0000-0000-0000-000000000001\u0000',
    "' OR true --",
  ])
    assert.throws(
      () => parseReportId(input),
      (error: unknown) =>
        error instanceof BadRequestException &&
        error.getStatus() === 400 &&
        error.message === 'Identificador de reporte inválido.',
      JSON.stringify(input),
    )
})
