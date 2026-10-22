import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { GetReport } from '../src/index.js'
import type { ReportRecord } from '../src/index.js'

const record = (overrides: Partial<ReportRecord> = {}): ReportRecord => ({
  id: 'report-1',
  ownerId: 'owner-1',
  type: 'lost',
  state: 'active',
  category: 'pet',
  title: 'Gato "Michi" perdido',
  description: 'Gato gris con collar azul, visto cerca del parque.',
  city: 'Cochabamba',
  zone: 'Cala Cala',
  incidentDate: '2026-10-09',
  createdAt: '2026-10-09T15:00:00.000000Z',
  author: { id: 'owner-1', displayName: 'Autora de prueba' },
  imageUrls: ['https://images.example.test/michi.jpg'],
  ...overrides,
})

test('el detalle de un reporte activo entrega su proyección pública por ID', async () => {
  const privateRecord = {
    ...record(),
    phone: 'private-phone-sentinel',
    storageKey: 'private-storage-sentinel',
    author: { id: 'owner-1', displayName: 'Autora de prueba', email: 'private-email-sentinel' },
  }
  const requested: string[] = []
  const detail = new GetReport({
    find: async (id) => {
      requested.push(id)
      return id === 'report-1' ? privateRecord : undefined
    },
  })
  assert.deepEqual(await detail.execute('report-1'), {
    id: 'report-1',
    type: 'lost',
    state: 'active',
    category: 'pet',
    title: 'Gato "Michi" perdido',
    description: 'Gato gris con collar azul, visto cerca del parque.',
    city: 'Cochabamba',
    zone: 'Cala Cala',
    incidentDate: '2026-10-09',
    createdAt: '2026-10-09T15:00:00.000000Z',
    author: { id: 'owner-1', displayName: 'Autora de prueba' },
    imageUrls: ['https://images.example.test/michi.jpg'],
  })
  assert.equal(await detail.execute('missing'), undefined)
  assert.deepEqual(requested, ['report-1', 'missing'])
})

test('un reporte resuelto solo se entrega a su propietario verificado', async () => {
  const detail = new GetReport({ find: async () => record({ state: 'resolved' }) })
  assert.equal(await detail.execute('report-1'), undefined, 'visitante sin sesión')
  assert.equal(await detail.execute('report-1', 'other-user'), undefined, 'otra cuenta')
  assert.equal((await detail.execute('report-1', 'owner-1'))?.state, 'resolved')
  const active = new GetReport({ find: async () => record() })
  assert.equal((await active.execute('report-1', 'other-user'))?.state, 'active')
})
