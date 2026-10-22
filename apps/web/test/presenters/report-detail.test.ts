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

/** Address bar double: `push`/`replace` and «Atrás» as the browser history would apply them. */
function fakeHistory(initial: string) {
  const entries = [initial]
  const changes: string[] = []
  let listener: ((path: string) => void) | undefined
  return {
    changes,
    current: () => entries[entries.length - 1]!,
    /** The person presses «Atrás» or «Adelante» to a path. */
    navigate: (path: string) => {
      entries.push(path)
      listener?.(path)
    },
    effects: {
      currentPath: () => entries[entries.length - 1]!,
      showPath: (path: string, mode: 'push' | 'replace') => {
        changes.push(`${mode} ${path}`)
        if (mode === 'replace') entries.pop()
        entries.push(path)
      },
      onPathChange: (next: (path: string) => void) => {
        listener = next
        return () => {
          listener = undefined
        }
      },
      back: () => {
        changes.push('back')
        entries.pop()
        listener?.(entries[entries.length - 1]!)
      },
    },
  }
}

function setup(options: { path?: string; session?: AuthState } = {}) {
  const session = new Session(options.session ?? { status: 'anonymous' })
  const api = {
    find: async (_id: string, _signal: AbortSignal): Promise<ReportSummary | undefined> => report,
    contact: async (_id: string): Promise<ReportContact | undefined> => ({ available: false }),
  }
  const opened: string[] = []
  const logins: string[] = []
  const history = fakeHistory(options.path ?? '/')
  const presenter = new ReportDetailPresenter({
    repository: { find: (id, signal) => api.find(id, signal), contact: (id) => api.contact(id) },
    auth: session,
    effects: {
      ...history.effects,
      openWhatsApp: (url) => opened.push(url),
      absoluteUrl: (path) => 'https://perdiu.test' + path,
    },
    onLoginRequired: () => logins.push('login'),
  })
  return { presenter, api, session, opened, logins, history }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

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

test('el enlace abre el reporte directamente o al recargar, y «Atrás» vuelve a la pantalla anterior', async () => {
  const direct = setup({ path: '/reportes/' + report.id })
  const stop = direct.presenter.start()
  await settle()
  assert.equal(
    direct.presenter.getSnapshot().status,
    'ready',
    'acceso directo sin pasar por el catálogo',
  )
  direct.presenter.close()
  assert.deepEqual(direct.history.changes, ['replace /'], 'cerrar no saca a la persona de PerdiU')
  assert.equal(direct.presenter.getSnapshot().status, 'closed')
  stop()

  const { presenter, history } = setup()
  presenter.start()
  await presenter.open(report.id)
  assert.equal(history.current(), '/reportes/' + report.id, 'la dirección es estable y recargable')
  history.navigate('/')
  assert.equal(presenter.getSnapshot().status, 'closed', '«Atrás» cierra el detalle')
  history.navigate('/reportes/otro-reporte')
  await settle()
  const forward = presenter.getSnapshot()
  assert.ok(forward.status === 'ready' && forward.id === 'otro-reporte', '«Adelante» lo reabre')
  history.navigate('/')
  await presenter.open(report.id)
  presenter.close()
  assert.deepEqual(history.changes, [
    'push /reportes/' + report.id,
    'push /reportes/' + report.id,
    'back',
  ])
  assert.equal(presenter.getSnapshot().status, 'closed')
})

test('el detalle espera la sesión, se recarga al cambiarla e ignora respuestas anteriores', async () => {
  const owner: AuthState = {
    status: 'authenticated',
    user: { id: report.author.id, email: 'autora@example.test' },
  }
  const { presenter, api, session } = setup({
    path: '/reportes/' + report.id,
    session: { status: 'restoring' },
  })
  const requests: string[] = []
  api.find = async () => {
    const viewer = session.getSnapshot()
    requests.push(viewer.status)
    return viewer.status === 'authenticated' ? { ...report, state: 'resolved' } : undefined
  }
  presenter.start()
  await settle()
  assert.deepEqual(requests, [], 'no consulta hasta saber quién mira')
  session.set(owner)
  await settle()
  assert.equal(presenter.getSnapshot().status, 'ready', 'la autora ve su caso resuelto al recargar')

  session.set({ status: 'anonymous', notice: 'Cerraste sesión correctamente.' })
  await settle()
  assert.equal(presenter.getSnapshot().status, 'unavailable', 'sin sesión deja de verlo')
  assert.deepEqual(requests, ['authenticated', 'anonymous'])

  let resolveOld!: (value: ReportSummary) => void
  api.find = (id) =>
    id === 'old'
      ? new Promise((done) => {
          resolveOld = done
        })
      : Promise.resolve(report)
  const old = presenter.open('old')
  await presenter.open(report.id)
  resolveOld({ ...report, id: 'old', title: 'Respuesta anterior' })
  await old
  const state = presenter.getSnapshot()
  assert.ok(state.status === 'ready' && state.id === report.id && state.card.title === report.title)
})
