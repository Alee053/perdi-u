import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { parseReportQuery } from '../src/reports/query.js'

test('la búsqueda acepta zona como frase opcional y recorta espacios exteriores', () => {
  assert.deepEqual(parseReportQuery({ zone: ' San José ' }), { zone: 'San José' })
  assert.deepEqual(parseReportQuery({ city: 'La Paz', zone: ' sopocachi ' }), {
    city: 'La Paz',
    zone: 'sopocachi',
  })
  assert.deepEqual(parseReportQuery({ zone: '' }), {})
})

test('la búsqueda rechaza zonas repetidas, estructuradas, con controles o demasiado largas', () => {
  for (const zone of [
    ['Sopocachi', 'Centro'],
    { contains: 'Sopocachi' },
    ` ${'x'.repeat(200)}`,
    'Sopocachi\u0000',
  ]) {
    assert.throws(() => parseReportQuery({ zone }), {
      message: 'Parámetros de búsqueda inválidos.',
    })
  }
})

test('la búsqueda acepta límites inclusivos de fecha y un rango de un solo día', () => {
  assert.deepEqual(parseReportQuery({ dateFrom: '2026-10-10' }), { dateFrom: '2026-10-10' })
  assert.deepEqual(parseReportQuery({ dateTo: '2026-10-10' }), { dateTo: '2026-10-10' })
  assert.deepEqual(parseReportQuery({ dateFrom: '2026-10-10', dateTo: '2026-10-10' }), {
    dateFrom: '2026-10-10',
    dateTo: '2026-10-10',
  })
})

test('la búsqueda rechaza fechas inexistentes, formatos distintos y rangos invertidos', () => {
  for (const query of [
    { dateFrom: '2026-02-29' },
    { dateTo: '2026-13-01' },
    { dateTo: '2026-04-31' },
    { dateFrom: '2100-02-29' },
    { dateTo: '2026-10-10T00:00:00Z' },
    { dateFrom: '10/10/2026' },
    { dateFrom: ' 2026-10-10 ' },
    { dateFrom: '0000-01-01' },
    { dateFrom: '2026-10-11', dateTo: '2026-10-10' },
    { dateFrom: ['2026-10-10'] },
    { dateTo: { value: '2026-10-10' } },
  ]) {
    assert.throws(() => parseReportQuery(query), {
      message: 'Parámetros de búsqueda inválidos.',
    })
  }
  assert.deepEqual(parseReportQuery({ dateFrom: '2024-02-29' }), { dateFrom: '2024-02-29' })
  assert.deepEqual(parseReportQuery({ dateTo: '2000-02-29' }), { dateTo: '2000-02-29' })
})
