import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import {
  ListOwnReports,
  ResolveReport,
  type ReportRecord,
  type ResolveReportResult,
} from '../src/index.js'

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

test('mis reportes incluye activos y resueltos propios por identidad, con proyección segura y orden estable', async () => {
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
  assert.ok(result.every((item) => !('ownerId' in item || 'phone' in item || 'storageKey' in item)))
  assert.deepEqual(await new ListOwnReports({ listOwned: async () => [] }).execute('owner-1'), [])
})

test('mis reportes respeta el filtro de estado y conserva el historial más allá del límite público', async () => {
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

test('resolver transmite el sujeto verificado al cambio atómico y conserva resultados y fallos', async () => {
  for (const outcome of ['resolved', 'forbidden', 'not_found'] satisfies ResolveReportResult[]) {
    const calls: string[][] = []
    const useCase = new ResolveReport({
      resolveOwned: async (id, ownerId) => {
        calls.push([id, ownerId])
        return outcome
      },
    })
    assert.equal(await useCase.execute('report-1', 'verified-owner'), outcome)
    assert.deepEqual(calls, [['report-1', 'verified-owner']])
  }
  const failure = new Error('unavailable')
  await assert.rejects(
    new ResolveReport({
      resolveOwned: async () => {
        throw failure
      },
    }).execute('report-1', 'owner-1'),
    (error) => error === failure,
  )
})
