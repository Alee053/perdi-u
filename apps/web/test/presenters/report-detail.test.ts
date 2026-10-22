import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import type { ReportContact, ReportSummary } from '@perdiu/contracts'
import type { AuthState } from '../../src/presenters/auth/auth.presenter.js'
import { ReportDetailPresenter } from '../../src/presenters/reports/report-detail.presenter.js'
import { Store } from '../../src/presenters/store.js'

const report: ReportSummary = {
  id: '20000000-0000-0000-0000-000000000002',
  type: 'lost',
  state: 'active',
  category: 'pet',
  title: 'Gato "Michi" perdido',
  description: 'Gato gris con collar azul, visto cerca del parque.',
  city: 'Cochabamba',
  zone: 'Cala Cala',
  incidentDate: '2026-10-09',
  createdAt: '2026-10-09T15:00:00.000000Z',
  author: { id: 'author-1', displayName: 'Autora de prueba' },
  imageUrls: [],
}

/** Session double: the presenter only reads and follows the AuthPresenter state. */
class Session extends Store<AuthState> {
  set = (state: AuthState) => this.setState(state)
}

function setup() {
  const session = new Session({ status: 'anonymous' })
  const api = {
    find: async (_id: string, _signal: AbortSignal): Promise<ReportSummary | undefined> => report,
    contact: async (_id: string): Promise<ReportContact | undefined> => ({ available: false }),
  }
  const opened: string[] = []
  const logins: string[] = []
  const presenter = new ReportDetailPresenter({
    repository: { find: (id, signal) => api.find(id, signal), contact: (id) => api.contact(id) },
    auth: session,
    effects: {
      openWhatsApp: (url) => opened.push(url),
      absoluteUrl: (path) => 'https://perdiu.test' + path,
    },
    onLoginRequired: () => logins.push('login'),
  })
  return { presenter, api, session, opened, logins }
}

test('abrir un reporte pasa de carga a su ficha pública con imagen genérica si no tiene fotos', async () => {
  const { presenter, api } = setup()
  let resolve!: (value: ReportSummary) => void
  api.find = () =>
    new Promise((done) => {
      resolve = done
    })
  const opening = presenter.open(report.id)
  assert.deepEqual(presenter.getSnapshot(), { status: 'loading', id: report.id })
  resolve(report)
  await opening
  const state = presenter.getSnapshot()
  assert.equal(state.status, 'ready')
  assert.ok(state.status === 'ready')
  assert.deepEqual(
    {
      title: state.card.title,
      badge: state.card.badge,
      category: state.card.category,
      image: state.card.image,
      place: [state.card.zone, state.card.city],
    },
    {
      title: 'Gato "Michi" perdido',
      badge: 'Perdido',
      category: 'Mascota',
      image: '/images/pet.svg',
      place: ['Cala Cala', 'Cochabamba'],
    },
  )
})

test('un reporte inexistente o no disponible y un fallo de carga se distinguen, y reintentar lo recupera', async () => {
  const { presenter, api } = setup()
  api.find = async () => undefined
  await presenter.open(report.id)
  assert.deepEqual(presenter.getSnapshot(), {
    status: 'unavailable',
    id: report.id,
    message: 'Reporte no disponible.',
  })

  api.find = async () => {
    throw new Error('private-network-sentinel')
  }
  await presenter.open(report.id)
  assert.deepEqual(presenter.getSnapshot(), {
    status: 'error',
    id: report.id,
    message: 'No se pudo cargar el reporte. Intenta nuevamente.',
  })

  api.find = async () => ({ ...report, state: 'resolved' })
  await presenter.retry()
  const state = presenter.getSnapshot()
  assert.ok(state.status === 'ready')
  assert.equal(state.card.badge, 'Resuelto')
})

const link = 'https://perdiu.test/reportes/' + report.id
const message =
  'Hola, vi tu reporte "Gato "Michi" perdido" en PerdiU y quiero coordinar contigo: ' + link

test('sin sesión, contactar pide ingresar sin consultar el contacto; con sesión abre WhatsApp', async () => {
  const { presenter, api, session, opened, logins } = setup()
  const contacts: string[] = []
  api.contact = async (id) => {
    contacts.push(id)
    return { available: true, whatsapp: '59170000001' }
  }
  await presenter.open(report.id)
  await presenter.contact()
  assert.equal(logins.length, 1, 'se solicita ingresar')
  assert.deepEqual(contacts, [], 'un visitante no consulta el contacto')
  assert.equal(presenter.getSnapshot().status, 'ready', 'el reporte sigue abierto para volver')

  session.set({ status: 'authenticated', user: { id: 'viewer-1', email: 'persona@example.test' } })
  await presenter.contact()
  assert.deepEqual(contacts, [report.id])
  assert.deepEqual(opened, ['https://wa.me/59170000001?text=' + encodeURIComponent(message)])
  assert.ok(
    !/59170000001/.test(JSON.stringify(presenter.getSnapshot())),
    'el teléfono no queda en el estado',
  )
})

test('sin contacto válido, con fallo o en un reporte propio no se abre ninguna conversación', async () => {
  const { presenter, api, session, opened } = setup()
  session.set({ status: 'authenticated', user: { id: 'viewer-1', email: 'persona@example.test' } })
  await presenter.open(report.id)
  const contactMessage = () => {
    const state = presenter.getSnapshot()
    return state.status === 'ready' ? state.contactMessage : state.status
  }

  api.contact = async () => ({ available: false })
  await presenter.contact()
  assert.equal(
    contactMessage(),
    'La persona que publicó este reporte no tiene un WhatsApp disponible.',
  )

  api.contact = async () => {
    throw new Error('private-network-sentinel')
  }
  await presenter.contact()
  assert.equal(contactMessage(), 'No se pudo obtener el contacto. Intenta nuevamente.')

  api.contact = async () => undefined
  await presenter.contact()
  assert.equal(contactMessage(), 'unavailable', 'el reporte dejó de estar disponible')

  let asked = 0
  api.contact = async () => {
    asked++
    return { available: true, whatsapp: '59170000001' }
  }
  session.set({
    status: 'authenticated',
    user: { id: report.author.id, email: 'autora@example.test' },
  })
  await presenter.open(report.id)
  await presenter.contact()
  assert.equal(asked, 0, 'la autora no se contacta a sí misma')
  assert.deepEqual(opened, [])
})
