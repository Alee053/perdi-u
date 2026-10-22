import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import type { ReportSummary } from '@perdiu/contracts'
import type { OwnReportsRepository } from '../../src/models/reports/own-reports-repository.js'
import { OwnReportsPresenter } from '../../src/presenters/reports/own-reports.presenter.js'
import { SessionRejected } from '../../src/models/auth/session.js'
import { Store } from '../../src/presenters/store.js'
import type { AuthState } from '../../src/presenters/auth/auth.presenter.js'

const report = (id: string, overrides: Partial<ReportSummary> = {}): ReportSummary => ({
  id,
  title: 'Mochila ' + id,
  description: 'Descripción ficticia para el test.',
  type: 'found',
  state: 'active',
  category: 'object',
  city: 'La Paz',
  zone: 'Centro',
  incidentDate: '2026-10-20',
  createdAt: '2026-10-20T12:00:00.000000Z',
  imageUrls: [],
  author: { id: 'owner-1', displayName: 'Mismo Nombre' },
  ...overrides,
})
function setup(repository: Partial<OwnReportsRepository> = {}) {
  const notices: string[] = []
  const resolved: string[] = []
  let rejected = 0
  let cleared = 0
  const presenter = new OwnReportsPresenter(
    { list: async () => [], resolve: async () => {}, ...repository },
    {
      notices: { show: (message) => notices.push(message) },
      onResolved: (item) => resolved.push(item.id),
      onSessionRejected: () => {
        rejected++
      },
      onOwnerChanged: () => {
        cleared++
      },
    },
  )
  return { presenter, notices, resolved, rejected: () => rejected, cleared: () => cleared }
}

test('la lista propia carga desde el puerto, separa nombres iguales y presenta los tres filtros', async () => {
  let complete!: (reports: ReportSummary[]) => void
  const { presenter } = setup({
    list: () =>
      new Promise((resolve) => {
        complete = resolve
      }),
  })
  const loading = presenter.setOwner('owner-1')
  assert.equal(presenter.view().status, 'loading')
  complete([
    report('active'),
    report('closed', { state: 'resolved' }),
    report('other', { author: { id: 'owner-2', displayName: 'Mismo Nombre' } }),
  ])
  await loading
  assert.deepEqual(
    presenter.view().cards.map(({ id }) => id),
    ['active', 'closed'],
  )
  assert.equal(presenter.view().total, 2)
  assert.equal(presenter.view().active, 1)
  presenter.setFilter('Activos')
  assert.deepEqual(
    presenter.view().cards.map(({ id }) => id),
    ['active'],
  )
  presenter.setFilter('Resueltos')
  assert.deepEqual(
    presenter.view().cards.map(({ id }) => id),
    ['closed'],
  )
  assert.equal(presenter.view().cards[0]?.status, 'Encontrado')
  assert.equal(presenter.view().cards[0]?.badge, 'Resuelto')
})

test('resolver pide confirmación, cancelar no escribe y un fallo conserva el estado para reintentar sin duplicar', async () => {
  let calls = 0
  let complete!: () => void
  let fail!: (error: Error) => void
  const { presenter, notices, resolved } = setup({
    list: async () => [report('own'), report('closed', { state: 'resolved' })],
    resolve: () => {
      calls++
      return new Promise<void>((resolve, reject) => {
        complete = resolve
        fail = reject
      })
    },
  })
  await presenter.setOwner('owner-1')
  presenter.requestResolve('closed')
  assert.equal(presenter.view().confirmation, null)
  presenter.requestResolve('own')
  assert.equal(presenter.view().confirmation?.id, 'own')
  presenter.cancelResolve()
  await presenter.confirmResolve()
  assert.equal(calls, 0, 'cancelar no envía un cierre')
  presenter.requestResolve('own')
  const failing = presenter.confirmResolve()
  assert.equal(presenter.view().confirmation?.pending, true)
  await presenter.confirmResolve()
  assert.equal(calls, 1, 'un segundo clic no duplica el envío')
  assert.equal(presenter.view().cards[0]?.resolved, false)
  assert.deepEqual(notices, [])
  fail(new Error('private server details'))
  await failing
  assert.equal(presenter.view().cards[0]?.resolved, false)
  assert.equal(
    presenter.view().confirmation?.error,
    'No se pudo resolver el reporte. Intenta nuevamente.',
  )
  const retry = presenter.confirmResolve()
  complete()
  await retry
  assert.equal(presenter.view().confirmation, null)
  assert.equal(presenter.view().cards[0]?.resolved, true)
  assert.equal(presenter.view().cards[0]?.status, 'Encontrado')
  assert.deepEqual(resolved, ['own'])
  assert.equal(notices.length, 1)
  presenter.requestResolve('own')
  await presenter.confirmResolve()
  assert.equal(calls, 2, 'un reporte resuelto no vuelve a ofrecer cierre')
})

test('cambiar de cuenta limpia los datos privados y descarta el éxito tardío de un cierre anterior', async () => {
  let complete!: () => void
  const { presenter, notices, resolved, cleared } = setup({
    list: async () => [report('own')],
    resolve: () =>
      new Promise<void>((resolve) => {
        complete = resolve
      }),
  })
  await presenter.setOwner('owner-1')
  presenter.requestResolve('own')
  const closing = presenter.confirmResolve()
  await presenter.setOwner('owner-2')
  assert.equal(cleared(), 2, 'limpia también detalles y otros datos privados de la composición')
  assert.deepEqual(presenter.view().cards, [])
  complete()
  await closing
  assert.deepEqual(notices, [])
  assert.deepEqual(resolved, [])
  assert.equal(presenter.view().confirmation, null)
  await presenter.setOwner(null)
  assert.equal(cleared(), 3)
  assert.deepEqual(presenter.getSnapshot().reports, [])
})

test('carga fallida, reintento vacío y sesión rechazada muestran estados distintos sin anunciar éxito', async () => {
  let unavailable = true
  const { presenter, notices, rejected } = setup({
    list: async () => {
      if (unavailable) throw new Error('private details')
      return []
    },
    resolve: async () => {
      throw new SessionRejected()
    },
  })
  await presenter.setOwner('owner-1')
  assert.equal(presenter.view().status, 'error')
  assert.equal(presenter.view().message, 'No se pudo cargar tus reportes. Intenta nuevamente.')
  unavailable = false
  await presenter.load()
  assert.equal(presenter.view().status, 'ready')
  assert.equal(presenter.view().empty.title, 'Aún no publicaste reportes')
  assert.deepEqual(notices, [])
  const expired = setup({
    list: async () => {
      throw new SessionRejected()
    },
  })
  await expired.presenter.setOwner('owner-1')
  assert.equal(expired.rejected(), 1)
  assert.deepEqual(expired.presenter.getSnapshot().reports, [])
  assert.equal(rejected(), 0)
})

test('el ciclo de sesión descarta una lista tardía y un 401 al cerrar borra la cuenta anterior', async () => {
  class Session extends Store<AuthState> {
    change = (state: AuthState) => this.setState(state)
  }
  const session = new Session({ status: 'anonymous' })
  let complete!: (reports: ReportSummary[]) => void
  let calls = 0
  const { presenter } = setup({
    list: () => {
      calls++
      return new Promise((resolve) => {
        complete = resolve
      })
    },
  })
  const stop = presenter.start(session)
  assert.equal(calls, 0)
  session.change({
    status: 'authenticated',
    user: { id: 'owner-1', email: 'ficticia@example.test' },
  })
  assert.equal(presenter.view().status, 'loading')
  session.change({ status: 'anonymous' })
  complete([report('late')])
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(presenter.view().cards, [])
  stop()
  const expired = setup({
    list: async () => [report('own')],
    resolve: async () => {
      throw new SessionRejected()
    },
  })
  await expired.presenter.setOwner('owner-1')
  expired.presenter.requestResolve('own')
  await expired.presenter.confirmResolve()
  assert.equal(expired.rejected(), 1)
  assert.deepEqual(expired.presenter.view().cards, [])
  assert.deepEqual(expired.notices, [])
})
