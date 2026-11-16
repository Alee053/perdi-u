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
