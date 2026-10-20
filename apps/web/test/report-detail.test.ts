import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import type { ReportDetail } from '@perdiu/contracts'
import {
  ContactUnavailable,
  createReportDetailClient,
  ReportUnavailable,
} from '../src/detail/client.js'
import { buildWhatsAppUrl, ReportDetailPresenter } from '../src/detail/presenter.js'

const report: ReportDetail = {
  id: '20000000-0000-0000-0000-000000000001',
  type: 'found',
  state: 'active',
  category: 'object',
  title: 'Cámara "Cálida" & mochila',
  description: 'Encontrada en el centro.',
  city: 'La Paz',
  zone: 'Centro',
  incidentDate: '2026-10-10',
  createdAt: '2026-10-11T12:00:00.000Z',
  author: { id: 'owner-1', displayName: 'Persona' },
  imageUrls: [],
}

test('el presenter muestra detalle persistente, estado/tipo y respaldo visual por categoría', async () => {
  const presenter = new ReportDetailPresenter({
    get: async () => report,
    contact: async () => ({ phone: '59170123456' }),
  })
  await presenter.load(report.id)
  assert.deepEqual(presenter.getSnapshot(), {
    status: 'ready',
    id: report.id,
    report: {
      id: report.id,
      source: 'catalog',
      authorId: 'owner-1',
      title: report.title,
      description: report.description,
      category: 'Objeto',
      status: 'Encontrado',
      city: 'La Paz',
      zone: 'Centro',
      date: '10 oct de 2026',
      posted: '11 oct de 2026',
      image: '/images/object.svg',
      person: 'Persona',
      initials: 'P',
      color: 'lavender',
      resolved: false,
    },
  })
})

test('el presenter diferencia no disponible de error y permite reintentar', async () => {
  let unavailable = true
  const presenter = new ReportDetailPresenter({
    get: async () => {
      if (unavailable) throw new ReportUnavailable()
      throw new Error('private-network-sentinel')
    },
    contact: async () => ({ phone: '59170123456' }),
  })
  await presenter.load(report.id)
  assert.deepEqual(presenter.getSnapshot(), { status: 'unavailable', id: report.id })
  unavailable = false
  await presenter.load(report.id)
  assert.deepEqual(presenter.getSnapshot(), {
    status: 'error',
    id: report.id,
    message: 'No se pudo cargar el reporte. Intenta nuevamente.',
  })
})

test('el enlace WhatsApp codifica acentos y signos y limita el destino al teléfono validado', () => {
  const link = new URL(buildWhatsAppUrl('59170123456', report, 'https://perdiu.example'))
  assert.equal(link.origin, 'https://wa.me')
  assert.equal(link.pathname, '/59170123456')
  assert.equal(
    link.searchParams.get('text'),
    `Hola, vi tu reporte "${report.title}" en PerdiU: https://perdiu.example${`/reports/${report.id}`}. ¿Podemos coordinar?`,
  )
  assert.throws(() => buildWhatsAppUrl('1234', report, 'https://perdiu.example'))
  assert.throws(() => buildWhatsAppUrl('59170123456', report, 'javascript:alert(1)'))
})

test('el cliente consulta el detalle sin sesión y solo envía el token al endpoint privado', async () => {
  const requests: { url: string; authorization?: string; cache?: string }[] = []
  let token: string | undefined
  const client = createReportDetailClient(
    '/api',
    async () => token,
    async (input, init) => {
      requests.push({
        url: String(input),
        authorization: new Headers(init?.headers).get('Authorization') ?? undefined,
        cache: init?.cache,
      })
      if (String(input).endsWith('/contact')) return new Response('{"phone":"59170123456"}')
      return new Response(JSON.stringify({ ...report, phone: 'private-sentinel' }))
    },
  )
  const detail = await client.get(report.id, new AbortController().signal)
  assert.deepEqual(JSON.parse(JSON.stringify(detail)), report)
  token = 'valid-session'
  assert.deepEqual(await client.contact(report.id), { phone: '59170123456' })
  assert.deepEqual(requests, [
    {
      url: `/api/reports/${report.id}`,
      authorization: undefined,
      cache: 'no-store',
    },
    {
      url: `/api/reports/${report.id}/contact`,
      authorization: 'Bearer valid-session',
      cache: 'no-store',
    },
  ])
})

test('un contacto ausente muestra un mensaje claro sin guardar el teléfono en estado', async () => {
  const presenter = new ReportDetailPresenter({
    get: async () => report,
    contact: async () => {
      throw new ContactUnavailable()
    },
  })
  await presenter.load(report.id)
  assert.equal(await presenter.contact('https://perdiu.example'), undefined)
  const state = presenter.getSnapshot()
  assert.equal(state.status, 'ready')
  if (state.status !== 'ready') return
  assert.equal(state.contactMessage, 'El contacto no está disponible.')
  assert.ok(!JSON.stringify(state).includes('591'))
})
