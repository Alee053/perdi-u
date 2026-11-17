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
  let returnable = false
  let listener: ((path: string) => void) | undefined
  return {
    changes,
    current: () => entries[entries.length - 1]!,
    /** The person presses «Atrás» or «Adelante» to a path. */
    navigate: (path: string, appEntry = false) => {
      returnable = appEntry
      entries.push(path)
      listener?.(path)
    },
    effects: {
      currentPath: () => entries[entries.length - 1]!,
      hasAppReturn: () => returnable,
      showPath: (path: string, mode: 'push' | 'replace') => {
        returnable = mode === 'push'
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
        returnable = false
        changes.push('back')
        entries.pop()
        listener?.(entries[entries.length - 1]!)
      },
    },
  }
}

function setup(options: { path?: string; session?: AuthState; allowResolve?: boolean } = {}) {
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
    isSaved: (id) => id === report.id,
    canResolve: () => options.allowResolve === true,
  })
  return { presenter, api, session, opened, logins, history }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

test('cerrar después de Atrás y Adelante recupera la dirección de búsqueda anterior', async () => {
  const search = '/?q=gato&zone=Cala+Cala&dateFrom=2026-10-01'
  const { presenter, history } = setup({ path: search })
  const stop = presenter.start()
  await presenter.open(report.id)
  const path = '/reportes/' + report.id
  assert.equal(history.current(), path, 'el enlace del reporte no arrastra filtros')
  history.effects.back()
  assert.equal(presenter.getSnapshot().status, 'closed')
  history.navigate(path, true)
  await settle()
  presenter.close()
  assert.equal(history.current(), search)
  assert.equal(history.changes.at(-1), 'back')
  stop()
})

test('una ruta de reporte con búsqueda conserva su ID y usa un enlace canónico al contactar', async () => {
  const { presenter, api, opened } = setup({
    path: '/reportes/' + report.id + '?q=private-sentinel&redirect=https%3A%2F%2Fexternal.test',
    session: { status: 'authenticated', user: { id: 'viewer-1', email: 'persona@example.test' } },
  })
  const requested: string[] = []
  api.find = async (id) => {
    requested.push(id)
    return report
  }
  api.contact = async () => ({ available: true, whatsapp: '59170000001' })
  const stop = presenter.start()
  await settle()
  assert.equal(presenter.getSnapshot().status, 'ready')
  assert.deepEqual(requested, [report.id])
  await presenter.contact()
  const message = new URL(opened[0]!).searchParams.get('text')!
  assert.ok(message.includes('https://perdiu.test/reportes/' + report.id))
  assert.ok(!message.includes('private-sentinel') && !message.includes('external.test'))
  stop()
})

test('la galería permite elegir y recorrer fotos y reinicia la selección al abrir otro reporte', async () => {
  const { presenter, api } = setup()
  const images = ['/api/media/first', '/api/media/second', '/api/media/third']
  api.find = async (id) => ({ ...report, id, imageUrls: images })
  const gallery = () => {
    const view = presenter.view()
    assert.ok(view?.status === 'ready')
    return view.detail.gallery
  }
  await presenter.open(report.id)
  assert.equal(gallery()?.source, images[0])
  assert.equal(gallery().caption, 'Foto 1 de 3')
  assert.equal(gallery().canNavigate, true)
  presenter.selectPhoto(2)
  assert.equal(gallery().source, images[2])
  assert.deepEqual(
    gallery().choices.map((choice) => choice.selected),
    [false, false, true],
  )
  presenter.nextPhoto()
  assert.equal(gallery().source, images[0], 'después de la última vuelve a la primera')
  presenter.previousPhoto()
  assert.equal(gallery().source, images[2])
  presenter.selectPhoto(-1)
  presenter.selectPhoto(3)
  presenter.selectPhoto(0.5)
  assert.equal(gallery().source, images[2], 'ignora selecciones fuera de la galería')
  await presenter.open('another-report')
  assert.equal(gallery().source, images[0])
  api.find = async () => ({ ...report, imageUrls: [images[0]!] })
  await presenter.retry()
  assert.equal(gallery().canNavigate, false, 'una sola foto no necesita controles')
  api.find = async () => report
  await presenter.retry()
  assert.equal(gallery().source, '/images/pet.svg')
  assert.equal(gallery().caption, 'Imagen de referencia de categoría')
  assert.deepEqual(gallery().choices, [])
})

test('terminar una solicitud de contacto conserva la foto elegida durante la espera', async () => {
  for (const fails of [false, true]) {
    const { presenter, api } = setup({
      session: { status: 'authenticated', user: { id: 'viewer-1', email: 'persona@example.test' } },
    })
    api.find = async () => ({ ...report, imageUrls: ['/api/media/first', '/api/media/second'] })
    await presenter.open(report.id)
    let finish!: () => void
    api.contact = () =>
      new Promise((resolve, reject) => {
        finish = () => (fails ? reject(new Error('network')) : resolve({ available: false }))
      })
    const pending = presenter.contact()
    presenter.selectPhoto(1)
    finish()
    await pending
    const view = presenter.view()
    assert.ok(view?.status === 'ready')
    assert.equal(view.detail.gallery.source, '/api/media/second')
  }
})

test('un contacto pendiente de otra sesión no restaura el detalle activo tras el cierre', async () => {
  for (const fails of [false, true]) {
    const { presenter, api, session, opened } = setup({
      session: {
        status: 'authenticated',
        user: { id: 'viewer-1', email: 'visitante@example.test' },
      },
      allowResolve: true,
    })
    const stop = presenter.start()
    await presenter.open(report.id)
    let finish!: () => void
    api.contact = () =>
      new Promise((resolve, reject) => {
        finish = () =>
          fails
            ? reject(new Error('private-details'))
            : resolve({ available: true, whatsapp: '59170000001' })
      })
    const contact = presenter.contact()
    session.set({
      status: 'authenticated',
      user: { id: report.author.id, email: 'autora@example.test' },
    })
    await settle()
    presenter.markResolved(report.id)
    finish()
    await contact
    const closed = presenter.view()
    assert.ok(closed?.status === 'ready' && closed.detail.card.resolved)
    assert.deepEqual(opened, [], 'un contacto anterior no abre un chat para la cuenta actual')
    stop()
  }
})

test('el cierre confirmado actualiza el detalle propio y descarta una recarga activa anterior', async () => {
  const { presenter, api } = setup({
    session: {
      status: 'authenticated',
      user: { id: report.author.id, email: 'autora@example.test' },
    },
    allowResolve: true,
  })
  await presenter.open(report.id)
  const own = presenter.view()
  assert.ok(own?.status === 'ready' && own.detail.canResolve && own.detail.canEdit)
  let complete!: (value: ReportSummary) => void
  api.find = () =>
    new Promise((resolve) => {
      complete = resolve
    })
  const refresh = presenter.retry()
  presenter.markResolved(report.id)
  complete(report)
  await refresh
  const closed = presenter.view()
  assert.ok(closed?.status === 'ready')
  assert.equal(closed.detail.card.badge, 'Resuelto')
  assert.equal(closed.detail.card.status, 'Perdido')
  assert.equal(closed.detail.canResolve, false)
  assert.equal(closed.detail.canEdit, false)
  assert.equal(closed.detail.canContact, false)
})

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

test('la vista del detalle indica qué acciones ofrecer y permite guardar el reporte abierto', async () => {
  const { presenter, api, session } = setup()
  assert.equal(presenter.view(), null, 'cerrado no muestra nada')
  api.find = async () => {
    throw new Error('network')
  }
  await presenter.open(report.id)
  assert.deepEqual(presenter.view(), {
    status: 'error',
    message: 'No se pudo cargar el reporte. Intenta nuevamente.',
    canRetry: true,
  })
  api.find = async () => undefined
  await presenter.retry()
  assert.deepEqual(presenter.view(), {
    status: 'unavailable',
    message: 'Reporte no disponible.',
    canRetry: false,
  })

  api.find = async () => report
  await presenter.retry()
  const view = presenter.view()
  assert.ok(view?.status === 'ready')
  assert.deepEqual(
    { ...view, detail: { ...view.detail, card: view.detail.card.id, gallery: undefined } },
    {
      status: 'ready',
      detail: {
        card: report.id,
        gallery: undefined,
        saved: true,
        canContact: true,
        canResolve: false,
        canEdit: false,
      },
      contacting: false,
    },
  )
  assert.deepEqual(presenter.find(report.id), { ...report, source: 'catalog' })
  assert.equal(presenter.find('other'), undefined)

  session.set({ status: 'authenticated', user: { id: report.author.id, email: 'a@example.test' } })
  const own = presenter.view()
  assert.ok(own?.status === 'ready' && !own.detail.canContact, 'la autora no ve contactar')
})
