import assert from 'node:assert/strict'
import { expect, test } from '@jest/globals'
import type { ReportSummary } from '@perdiu/contracts'
import { SessionRejected } from '../src/models/auth/session.js'
import { createReportDetailClient } from '../src/infrastructure/http/catalog-client.js'

const report: ReportSummary = {
  id: '20000000-0000-0000-0000-000000000003',
  type: 'found',
  state: 'resolved',
  category: 'document',
  title: 'Documento devuelto',
  description: 'Carnet devuelto a su dueña.',
  city: 'La Paz',
  zone: 'Centro',
  incidentDate: '2026-10-08',
  createdAt: '2026-10-08T12:00:00.000000Z',
  author: { id: 'owner-2', displayName: 'Autora de prueba' },
  imageUrls: [],
}

function fakeApi() {
  const requests: { url: string; authorization: string | null; cache?: string }[] = []
  const api = { status: 200, body: {} as unknown }
  const fetcher = (async (url: string, init: RequestInit) => {
    requests.push({
      url,
      authorization: new Headers(init.headers).get('authorization'),
      cache: init.cache,
    })
    return new Response(JSON.stringify(api.body), { status: api.status })
  }) as typeof fetch
  return { requests, api, fetcher }
}

test('el detalle envía la sesión si existe y conserva solo campos públicos, también de un resuelto', async () => {
  const { requests, api, fetcher } = fakeApi()
  let token: string | undefined = 'access-token'
  const client = createReportDetailClient('/api/', async () => token, fetcher)
  api.body = { ...report, ownerId: 'owner-2', phone: 'private-sentinel' }
  const signal = new AbortController().signal

  expect(await client.find(report.id, signal)).toStrictEqual(report)
  token = undefined
  expect(await client.find('a/b', signal)).toStrictEqual(report)
  assert.deepEqual(requests, [
    { url: `/api/reports/${report.id}`, authorization: 'Bearer access-token', cache: 'no-store' },
    { url: '/api/reports/a%2Fb', authorization: null, cache: 'no-store' },
  ])
})

test('el detalle distingue un reporte no disponible de un fallo o una respuesta inválida', async () => {
  const { api, fetcher } = fakeApi()
  const client = createReportDetailClient('/api', async () => undefined, fetcher)
  const signal = new AbortController().signal
  for (const status of [400, 404]) {
    api.status = status
    assert.equal(await client.find(report.id, signal), undefined, String(status))
  }
  api.status = 503
  await assert.rejects(client.find(report.id, signal))
  api.status = 200
  api.body = { ...report, state: 'archived' }
  await assert.rejects(client.find(report.id, signal))
})

test('el contacto exige sesión, valida el número y distingue un reporte ya no disponible', async () => {
  const { requests, api, fetcher } = fakeApi()
  let token: string | undefined
  const client = createReportDetailClient('/api', async () => token, fetcher)

  await assert.rejects(client.contact(report.id), SessionRejected)
  assert.deepEqual(requests, [], 'sin sesión no se consulta el contacto')

  token = 'access-token'
  api.body = { available: true, whatsapp: '59170000001', email: 'private-sentinel' }
  assert.deepEqual(await client.contact(report.id), { available: true, whatsapp: '59170000001' })
  assert.deepEqual(requests, [
    {
      url: `/api/reports/${report.id}/contact`,
      authorization: 'Bearer access-token',
      cache: 'no-store',
    },
  ])
  api.body = { available: false }
  assert.deepEqual(await client.contact(report.id), { available: false })
  api.status = 404
  assert.equal(await client.contact(report.id), undefined)
  api.status = 401
  await assert.rejects(client.contact(report.id), SessionRejected)
  api.status = 200
  for (const body of [
    { available: true, whatsapp: 'https://evil.example' },
    { available: true },
    { whatsapp: '59170000001' },
  ]) {
    api.body = body
    await assert.rejects(
      client.contact(report.id),
      (error) => !(error instanceof SessionRejected),
      JSON.stringify(body),
    )
  }
})
