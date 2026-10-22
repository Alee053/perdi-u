import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import {
  hasActiveFilters,
  matchesFilters,
  noFilters,
  toReportQuery,
} from '../../src/models/reports/filters.js'
import {
  isAcceptedPhoto,
  publishDemoReport,
  removeReport,
  resolveReport,
  validateDraft,
  type ReportDraft,
} from '../../src/models/reports/publication.js'
import { demoOwner, isOwnedBy, type DemoReport } from '../../src/models/reports/report.js'
import { summarizeReports } from '../../src/models/reports/stats.js'

const report = (overrides: Partial<DemoReport> = {}): DemoReport => ({
  id: 'demo-1',
  source: 'demo',
  type: 'lost',
  state: 'active',
  category: 'pet',
  title: 'Luna, perrita café',
  description: 'Se perdió cerca del parque de Sopocachi.',
  city: 'La Paz',
  zone: 'Sopocachi',
  incidentDate: '2026-10-06',
  createdAt: '2026-10-06T14:00:00.000Z',
  imageUrls: [],
  author: { id: 'demo-mariana', displayName: 'Mariana Rojas' },
  phone: '59170000001',
  position: { top: '30%', left: '28%' },
  ...overrides,
})

const draft: ReportDraft = {
  type: 'found',
  category: 'object',
  title: '  Mochila azul  ',
  description: '  La encontré en un minibús de la línea 2.  ',
  city: 'La Paz',
  zone: ' Miraflores ',
  incidentDate: '2026-10-06',
  phone: '+591 70000000',
}

test('los filtros se traducen a la consulta pública sin texto vacío ni criterios ausentes', () => {
  assert.deepEqual(toReportQuery(noFilters), {})
  assert.equal(hasActiveFilters({ text: '   ' }), false)
  assert.deepEqual(
    toReportQuery({ text: '  CÁMARA ', city: 'La Paz', category: 'object', type: 'lost' }),
    { q: 'CÁMARA', city: 'La Paz', category: 'object', type: 'lost' },
  )
  assert.equal(hasActiveFilters({ text: '', type: 'found' }), true)
})

test('la búsqueda local ignora tildes y mayúsculas y excluye reportes resueltos', () => {
  assert.equal(matchesFilters(report(), { text: 'SOPOCACHÍ' }), true)
  assert.equal(matchesFilters(report(), { text: '', city: 'Cochabamba' }), false)
  assert.equal(matchesFilters(report(), { text: '', category: 'pet', type: 'lost' }), true)
  assert.equal(matchesFilters(report({ state: 'resolved' }), noFilters), false)
})

test('el resumen cuenta activos por tipo y ciudad y aparte los resueltos', () => {
  const stats = summarizeReports([
    report(),
    report({ id: 'demo-2', type: 'found', city: 'Cochabamba' }),
    report({ id: 'demo-3', city: 'Tarija' }),
    report({ id: 'demo-4', state: 'resolved' }),
  ])
  assert.deepEqual(stats, {
    active: 3,
    lost: 2,
    found: 1,
    resolved: 1,
    byCity: [
      { city: 'La Paz', count: 1 },
      { city: 'Cochabamba', count: 1 },
      { city: 'Santa Cruz', count: 0 },
    ],
    other: 1,
  })
})

test('un borrador exige título, descripción suficiente y zona', () => {
  assert.deepEqual(validateDraft(draft), {})
  assert.deepEqual(validateDraft({ ...draft, title: '  ', description: 'corta', zone: '  ' }), {
    title: 'required',
    description: 'too_short',
    zone: 'required',
  })
  assert.deepEqual(validateDraft({ ...draft, title: '', description: '' }), {
    title: 'required',
    description: 'required',
  })
})

test('publicar exige fecha válida, WhatsApp internacional y especie para mascotas', () => {
  assert.deepEqual(
    validateDraft({
      ...draft,
      category: 'pet',
      incidentDate: '2026-02-30',
      phone: '59170000000',
      petSpecies: ' ',
    } as ReportDraft),
    { incidentDate: 'invalid', phone: 'invalid', petSpecies: 'required' },
  )
})

test('solo se aceptan fotos JPG o PNG de hasta 5 MB', () => {
  assert.equal(isAcceptedPhoto({ type: 'image/png', size: 5 * 1024 * 1024 }), true)
  assert.equal(isAcceptedPhoto({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 }), false)
  assert.equal(isAcceptedPhoto({ type: 'image/gif', size: 10 }), false)
})

test('publicar crea un reporte activo del dueño con texto limpio y la fecha de hoy si falta', () => {
  const now = new Date('2026-10-21T02:30:00.000Z') // 20 de octubre, 22:30 en La Paz
  const published = publishDemoReport(
    { ...draft, incidentDate: '', imageUrl: 'blob:preview' },
    { id: 'demo-9', now, owner: demoOwner },
  )
  assert.deepEqual(published, {
    id: 'demo-9',
    source: 'demo',
    type: 'found',
    state: 'active',
    category: 'object',
    title: 'Mochila azul',
    description: 'La encontré en un minibús de la línea 2.',
    city: 'La Paz',
    zone: 'Miraflores',
    incidentDate: '2026-10-20',
    createdAt: '2026-10-21T02:30:00.000Z',
    imageUrls: ['blob:preview'],
    author: { id: demoOwner.id, displayName: demoOwner.displayName },
    phone: demoOwner.phone,
    position: { top: '48%', left: '48%' },
  })
  assert.equal(isOwnedBy(published, demoOwner.id), true)
  assert.equal(
    publishDemoReport({ ...draft, incidentDate: '2026-10-01' }, { id: 'x', now, owner: demoOwner })
      .incidentDate,
    '2026-10-01',
  )
})

test('solo el dueño resuelve o elimina un reporte; el nombre visible no basta', () => {
  const own = report({ id: 'own', author: { id: demoOwner.id, displayName: 'Otra persona' } })
  const impostor = report({ id: 'other', author: { id: 'x', displayName: demoOwner.displayName } })
  const reports = [own, impostor]
  assert.deepEqual(
    resolveReport(reports, 'own', demoOwner.id).map(({ state }) => state),
    ['resolved', 'active'],
  )
  assert.equal(resolveReport(reports, 'other', demoOwner.id), reports)
  assert.deepEqual(
    removeReport(reports, 'own', demoOwner.id).map(({ id }) => id),
    ['other'],
  )
  assert.equal(removeReport(reports, 'other', demoOwner.id), reports)
})
