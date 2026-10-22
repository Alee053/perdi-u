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
  const presenter = new ReportDetailPresenter({
    repository: { find: (id, signal) => api.find(id, signal), contact: (id) => api.contact(id) },
    auth: session,
  })
  return { presenter, api, session }
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
