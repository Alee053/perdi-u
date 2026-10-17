import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { ListReports } from '../src/index.js'
import type { ReportRecord } from '../src/index.js'

const record = (id: string, overrides: Partial<ReportRecord> = {}): ReportRecord => ({
  id,
  ownerId: 'owner-1',
  type: 'found',
  state: 'active',
  category: 'object',
  title: 'Mochila azul',
  description: 'Encontrada en un minibús.',
  city: 'La Paz',
  zone: 'Centro',
  incidentDate: '2026-10-10',
  createdAt: '2026-10-10T12:00:00.000Z',
  author: { id: 'owner-1', displayName: 'Autor de prueba' },
  imageUrls: [],
  ...overrides,
})

test('el catálogo se ordena por creación descendente y por ID ascendente en empates', async () => {
  const reports = [
    record('b'),
    record('old', { createdAt: '2026-10-01T12:00:00.000Z' }),
    record('a'),
    record('new', { createdAt: '2026-10-11T12:00:00.000Z' }),
  ]
  const result = await new ListReports({ list: async () => reports }).execute()
  assert.deepEqual(
    result.map(({ id }) => id),
    ['new', 'a', 'b', 'old'],
  )
})

test('el visitante solo ve activos y su proyección conserva el tipo de hallazgo', async () => {
  const reports = [record('active'), record('closed', { state: 'resolved' })]
  const result = await new ListReports({ list: async () => reports }).execute()
  assert.deepEqual(
    result.map(({ id, type, state }) => ({ id, type, state })),
    [{ id: 'active', type: 'found', state: 'active' }],
  )
})

test('el caso de uso transmite los filtros al puerto de búsqueda', async () => {
  const query = { q: 'camara', type: 'lost', category: 'object', city: 'La Paz' } as const
  let received: unknown
  const result = await new ListReports({
    list: async (filters) => {
      received = filters
      return []
    },
  }).execute(query)
  assert.deepEqual(received, query)
  assert.deepEqual(result, [])
})

test('el máximo de 50 se aplica después de excluir resueltos y ordenar', async () => {
  const reports = Array.from({ length: 60 }, (_, index) =>
    record(String(index).padStart(2, '0')),
  ).reverse()
  reports.unshift(record('resolved', { state: 'resolved', createdAt: '2026-10-15T12:00:00.000Z' }))
  const result = await new ListReports({ list: async () => reports }).execute()
  assert.equal(result.length, 50)
  assert.equal(result[0]!.id, '00')
  assert.equal(result[49]!.id, '49')
})

test('la proyección pública excluye contacto, identidad privada y claves de almacenamiento', async () => {
  const privateRecord = {
    ...record('public'),
    phone: 'private-phone-sentinel',
    email: 'private-email-sentinel',
    storageKey: 'private-storage-sentinel',
    token: 'private-token-sentinel',
    author: { id: 'owner-1', displayName: 'Autor de prueba', email: 'private-author-sentinel' },
  }
  const result = await new ListReports({ list: async () => [privateRecord] }).execute()
  assert.deepEqual(result, [
    {
      id: 'public',
      type: 'found',
      state: 'active',
      category: 'object',
      title: 'Mochila azul',
      description: 'Encontrada en un minibús.',
      city: 'La Paz',
      zone: 'Centro',
      incidentDate: '2026-10-10',
      createdAt: '2026-10-10T12:00:00.000Z',
      author: { id: 'owner-1', displayName: 'Autor de prueba' },
      imageUrls: [],
    },
  ])
})

test('el catálogo conserva el orden de PostgreSQL dentro de un mismo milisegundo', async () => {
  const reports = [
    record('a', { createdAt: '2026-10-10T12:00:00.123100Z' }),
    record('b', { createdAt: '2026-10-10T12:00:00.123900Z' }),
  ]
  const result = await new ListReports({ list: async () => reports }).execute()
  assert.deepEqual(
    result.map(({ id }) => id),
    ['b', 'a'],
  )
})
