import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { ListOwnReports, ResolveReport, type ReportRecord } from '../src/index.js'

const report = (id: string, overrides: Partial<ReportRecord> = {}): ReportRecord => ({
  id,
  ownerId: 'owner-1',
  type: 'found',
  state: 'active',
  category: 'object',
  title: 'Mochila de prueba encontrada',
  description: 'Encontrada cerca de la plaza de prueba.',
  city: 'La Paz',
  zone: 'Centro',
  incidentDate: '2026-10-20',
  createdAt: '2026-10-20T12:00:00.123100Z',
  author: { id: 'owner-1', displayName: 'Mismo Nombre' },
  imageUrls: [],
  ...overrides,
})

test('mis reportes incluye activos y resueltos propios, por identidad y con proyección segura', async () => {
  let received: unknown
  const records = [
    { ...report('active'), phone: 'private-phone', storageKey: 'private-key' },
    report('other', { ownerId: 'owner-2', author: { id: 'owner-2', displayName: 'Mismo Nombre' } }),
    report('resolved', { state: 'resolved', createdAt: '2026-10-20T12:00:00.123900Z' }),
  ]
  const result = await new ListOwnReports({
    listOwned: async (ownerId, query) => {
      received = { ownerId, query }
      return records
    },
  }).execute('owner-1')
  assert.deepEqual(received, { ownerId: 'owner-1', query: {} })
  assert.deepEqual(
    result.map(({ id, state, type }) => ({ id, state, type })),
    [
      { id: 'resolved', state: 'resolved', type: 'found' },
      { id: 'active', state: 'active', type: 'found' },
    ],
  )
  assert.equal(
    result.some((item) => 'ownerId' in item || 'phone' in item || 'storageKey' in item),
    false,
  )
})

test('mis reportes transmite y respeta el filtro de estado sin truncar el historial a 50', async () => {
  const records = Array.from({ length: 55 }, (_, i) => report(String(i), { state: 'resolved' }))
  let received: unknown
  const useCase = new ListOwnReports({
    listOwned: async (ownerId, query) => {
      received = { ownerId, query }
      return [report('active'), ...records]
    },
  })
  const result = await useCase.execute('owner-1', { state: 'resolved' })
  assert.deepEqual(received, { ownerId: 'owner-1', query: { state: 'resolved' } })
  assert.equal(result.length, 55)
  assert.ok(result.every((item) => item.state === 'resolved'))
})

test('resolver transmite la identidad al cambio atómico y conserva sus resultados y fallos', async () => {
  const records = [report('own'), report('other', { ownerId: 'owner-2' })]
  const useCase = new ResolveReport({
    resolveOwned: async (id, ownerId) => {
      const target = records.find((item) => item.id === id)
      if (!target) return 'not_found'
      if (target.ownerId !== ownerId) return 'forbidden'
      target.state = 'resolved'
      return 'resolved'
    },
  })
  assert.equal(await useCase.execute('own', 'owner-1'), 'resolved')
  assert.equal(await useCase.execute('own', 'owner-1'), 'resolved')
  assert.equal(await useCase.execute('own', 'owner-2'), 'forbidden')
  assert.equal(await useCase.execute('other', 'owner-1'), 'forbidden')
  assert.equal(await useCase.execute('missing', 'owner-1'), 'not_found')
  assert.deepEqual(
    records.map(({ state, type }) => ({ state, type })),
    [
      { state: 'resolved', type: 'found' },
      { state: 'active', type: 'found' },
    ],
  )
  const failure = new Error('unavailable')
  await assert.rejects(
    new ResolveReport({
      resolveOwned: async () => {
        throw failure
      },
    }).execute('own', 'owner-1'),
    (error) => error === failure,
  )
})
