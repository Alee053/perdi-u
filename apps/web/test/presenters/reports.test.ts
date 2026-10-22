import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { demoOwner, type CatalogReport, type DemoReport } from '../../src/models/reports/report.js'
import { defaultSelection } from '../../src/presenters/catalog/filters.presenter.js'
import { NoticePresenter } from '../../src/presenters/app/notice.presenter.js'
import { PublishPresenter } from '../../src/presenters/reports/publish.presenter.js'
import { ReportsPresenter } from '../../src/presenters/reports/reports.presenter.js'

const base = {
  type: 'lost' as const,
  state: 'active' as const,
  category: 'pet' as const,
  description: 'Descripción de prueba suficientemente larga.',
  city: 'La Paz',
  zone: 'Sopocachi',
  incidentDate: '2026-10-06',
  createdAt: '2026-10-06T14:00:00.000Z',
  imageUrls: [],
}
const demo = (id: string, overrides: Partial<DemoReport> = {}): DemoReport => ({
  ...base,
  id,
  source: 'demo',
  title: 'Reporte ' + id,
  author: { id: 'demo-mariana', displayName: 'Mariana Rojas' },
  phone: '59170000001',
  position: { top: '30%', left: '28%' },
  ...overrides,
})
const own = (id: string, overrides: Partial<DemoReport> = {}) =>
  demo(id, { author: { id: demoOwner.id, displayName: demoOwner.displayName }, ...overrides })
const catalogReport: CatalogReport = {
  ...base,
  id: 'catalog-1',
  source: 'catalog',
  title: 'Mochila azul encontrada',
  type: 'found',
  category: 'object',
  author: { id: 'owner-1', displayName: 'Santiago Demo' },
}

function setup(reports: DemoReport[] = [], saved: string[] = []) {
  const notices: { message: string; error: boolean }[] = []
  const opened: string[] = []
  const links: string[] = []
  const catalog = { find: (id: string) => (id === catalogReport.id ? catalogReport : undefined) }
  const presenter = new ReportsPresenter(
    reports,
    {
      catalog,
      notices: { show: (message: string, error = false) => notices.push({ message, error }) },
      effects: { openWhatsApp: (url: string) => opened.push(url) },
      links: { open: (id: string) => void links.push(id) },
    },
    saved,
  )
  return { presenter, notices, opened, links }
}

test('guardar un reporte del catálogo lo conserva aunque cambien los resultados, y quitarlo avisa', () => {
  const { presenter, notices } = setup([demo('demo-1')])
  presenter.toggleSaved(catalogReport.id)
  presenter.toggleSaved('demo-1')
  assert.deepEqual(
    presenter.saved().map(({ id }) => id),
    ['catalog-1', 'demo-1'],
  )
  assert.equal(presenter.isSaved('catalog-1'), true)
  presenter.toggleSaved(catalogReport.id)
  assert.deepEqual(
    presenter.saved().map(({ id }) => id),
    ['demo-1'],
  )
  assert.deepEqual(
    notices.map(({ message }) => message),
    [
      'Guardaste este reporte para revisarlo después.',
      'Guardaste este reporte para revisarlo después.',
      'Quitaste este reporte de tus guardados.',
    ],
  )
})

test('el detalle ofrece contacto en reportes ajenos y resolver en los propios', () => {
  const { presenter, opened, links } = setup([demo('demo-1'), own('demo-2')])
  presenter.open('demo-1')
  assert.deepEqual(
    { ...presenter.detail(), card: undefined },
    { card: undefined, saved: false, canContact: true, canResolve: false },
  )
  presenter.contact('demo-1')
  assert.deepEqual(opened, [
    'https://wa.me/59170000001?text=' +
      encodeURIComponent('Hola, vi tu reporte "Reporte demo-1" en PerdiU. ¿Podemos coordinar?'),
  ])
  presenter.open('demo-2')
  assert.equal(presenter.detail()?.canResolve, true)
  presenter.close()
  assert.equal(presenter.detail(), null)
  // Catalog reports open through their stable link, which the API keeps up to date.
  presenter.open(catalogReport.id)
  assert.deepEqual(links, [catalogReport.id])
  assert.equal(presenter.detail(), null)
  presenter.open('demo-1')
  presenter.close()
  assert.equal(presenter.detail(), null)
})

test('resolver y eliminar solo afectan reportes propios y actualizan resumen, mapa y listas', () => {
  const { presenter, notices } = setup(
    [own('demo-1'), demo('demo-2', { type: 'found', city: 'Cochabamba' })],
    ['demo-1'],
  )
  presenter.open('demo-1')
  presenter.resolve('demo-1')
  presenter.resolve('demo-2')
  assert.equal(presenter.detail()?.card.badge, 'Resuelto')
  assert.deepEqual(
    presenter.overview().metrics.map(({ value }) => value),
    [1, 0, 1, 1],
  )
  assert.equal(presenter.mapView(defaultSelection).count, 1)
  assert.deepEqual(presenter.saved(), [], 'un resuelto deja de mostrarse en guardados')
  presenter.setOwnFilter('Resueltos')
  assert.deepEqual(
    presenter.myReports().cards.map(({ id }) => id),
    ['demo-1'],
  )
  presenter.remove('demo-1')
  presenter.remove('demo-2')
  assert.deepEqual(presenter.myReports().total, 0)
  assert.equal(presenter.myReports().empty.title, 'Todavía no tienes reportes resueltos')
  assert.equal(presenter.counts().saved, 0)
  assert.equal(presenter.detail(), null)
  assert.deepEqual(
    notices.map(({ message }) => message),
    [
      'Marcaste el reporte como resuelto; ya no aparecerá en las búsquedas.',
      'El reporte se quitó de la lista.',
    ],
  )
})

test('el mapa aplica la selección visible y numera los puntos', () => {
  const { presenter } = setup([
    demo('demo-1', { zone: 'Sopocachi' }),
    demo('demo-2', { type: 'found', category: 'object', zone: 'Miraflores' }),
  ])
  const view = presenter.mapView({
    ...defaultSelection,
    search: 'MIRAFLÓRES',
    category: 'Objeto',
    status: 'Encontrado',
  })
  assert.equal(view.count, 1)
  assert.deepEqual(view.pins, [
    {
      id: 'demo-2',
      label: 'Ver Reporte demo-2',
      tone: 'found',
      top: '30%',
      left: '28%',
      number: 1,
    },
  ])
})

test('cerrar sesión borra los datos privados del dispositivo', () => {
  const { presenter } = setup([demo('demo-1')], ['demo-1'])
  presenter.toggleSaved(catalogReport.id)
  presenter.open('demo-1')
  presenter.clearPrivateData()
  assert.deepEqual(presenter.counts(), { own: 0, saved: 0 })
  assert.equal(presenter.detail(), null)
})

function publishSetup() {
  const added: unknown[] = []
  const notices: string[] = []
  const revoked: string[] = []
  let resets = 0
  let published = 0
  const presenter = new PublishPresenter({
    reports: { add: (report) => added.push(report) },
    filters: { reset: () => resets++ },
    notices: { show: (message: string) => notices.push(message) },
    effects: {
      createPreview: (file) => 'blob:' + file.type,
      revokePreview: (url) => revoked.push(url),
      now: () => new Date('2026-10-20T15:00:00.000Z'),
      newId: () => 'demo-new',
    },
    onPublished: () => published++,
  })
  return { presenter, added, notices, revoked, counts: () => ({ resets, published }) }
}

test('publicar muestra los errores del modelo junto a cada campo y no publica', () => {
  const { presenter, added } = publishSetup()
  presenter.setField('title', 'ab')
  assert.equal(presenter.submit(), false)
  assert.deepEqual(presenter.getSnapshot().errors, {
    title: 'Usa al menos 3 caracteres.',
    description: 'Describe lo que perdiste o encontraste.',
    zone: 'Indica la zona o el barrio.',
  })
  presenter.setField('title', 'Mochila azul')
  assert.equal(presenter.getSnapshot().errors.title, undefined, 'editar limpia su error')
  assert.deepEqual(added, [])
})

test('una foto inválida se rechaza con aviso y reemplazar la vista previa libera la anterior', () => {
  const { presenter, notices, revoked } = publishSetup()
  presenter.choosePhoto({ type: 'image/gif', size: 10 })
  assert.equal(presenter.getSnapshot().imagePreview, '')
  assert.deepEqual(notices, ['Elige una imagen JPG o PNG de máximo 5 MB.'])
  presenter.choosePhoto({ type: 'image/png', size: 10 })
  presenter.choosePhoto({ type: 'image/jpeg', size: 10 })
  assert.equal(presenter.getSnapshot().imagePreview, 'blob:image/jpeg')
  presenter.clearPhoto()
  assert.deepEqual(revoked, ['blob:image/png', 'blob:image/jpeg'])
})

test('publicar un borrador válido crea el reporte del dueño, limpia filtros y el formulario', () => {
  const { presenter, added, notices, revoked, counts } = publishSetup()
  presenter.setType('found')
  presenter.setField('category', 'object')
  presenter.setField('title', 'Mochila azul')
  presenter.setField('description', 'La encontré en un minibús de la línea 2.')
  presenter.setField('zone', 'Miraflores')
  presenter.choosePhoto({ type: 'image/png', size: 10 })
  assert.equal(presenter.submit(), true)
  assert.deepEqual(added, [
    {
      id: 'demo-new',
      source: 'demo',
      type: 'found',
      state: 'active',
      category: 'object',
      title: 'Mochila azul',
      description: 'La encontré en un minibús de la línea 2.',
      city: 'La Paz',
      zone: 'Miraflores',
      incidentDate: '2026-10-20',
      createdAt: '2026-10-20T15:00:00.000Z',
      imageUrls: ['blob:image/png'],
      author: { id: demoOwner.id, displayName: demoOwner.displayName },
      phone: demoOwner.phone,
      position: { top: '48%', left: '48%' },
    },
  ])
  assert.deepEqual(counts(), { resets: 1, published: 1 })
  assert.deepEqual(notices, [
    'Tu reporte ya está publicado. Puedes gestionarlo desde Mis reportes.',
  ])
  assert.deepEqual(revoked, [], 'la foto publicada sigue en uso')
  assert.equal(presenter.getSnapshot().draft.title, '')
  assert.equal(presenter.getSnapshot().imagePreview, '')
})

test('un aviso nuevo reemplaza al anterior y se cierra solo tras su duración', () => {
  const tasks: { run: () => void; cancelled: boolean }[] = []
  const notices = new NoticePresenter({
    schedule: (run) => {
      const task = { run, cancelled: false }
      tasks.push(task)
      return () => {
        task.cancelled = true
      }
    },
  })
  notices.show('Primero')
  notices.show('No se pudo cerrar la sesión.', true)
  assert.deepEqual(notices.getSnapshot(), { message: 'No se pudo cerrar la sesión.', error: true })
  assert.equal(tasks[0]!.cancelled, true, 'el temporizador anterior no cierra el aviso nuevo')
  tasks[1]!.run()
  assert.equal(notices.getSnapshot(), null)
})
