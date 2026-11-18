import assert from 'node:assert/strict'
import { expect, test } from '@jest/globals'
import type { ReportSummary } from '@perdiu/contracts'
import { CatalogPresenter } from '../src/presenters/catalog/catalog.presenter.js'
import { createReportsClient } from '../src/infrastructure/http/catalog-client.js'
import { defaultSelection, FiltersPresenter } from '../src/presenters/catalog/filters.presenter.js'

test('el cierre retira el reporte y descarta respuestas anteriores conservando la búsqueda', async () => {
  let complete!: (reports: ReportSummary[]) => void
  let calls = 0
  const queries: unknown[] = []
  const presenter = new CatalogPresenter({
    list: async (_signal, query) => {
      queries.push(query)
      if (++calls === 2)
        return new Promise((resolve) => {
          complete = resolve
        })
      return calls === 1 ? [summary] : []
    },
  })
  await presenter.load({ ...defaultSelection, search: 'Mochila' })
  const old = presenter.load()
  presenter.removeResolved(summary.id)
  complete([summary])
  await old
  assert.equal(presenter.find(summary.id), undefined)
  assert.deepEqual(presenter.getSnapshot(), { status: 'ready', reports: [] })
  await presenter.load()
  assert.deepEqual(queries, [{ q: 'Mochila' }, { q: 'Mochila' }, { q: 'Mochila' }])
})

const summary: ReportSummary = {
  id: '20000000-0000-0000-0000-000000000001',
  type: 'found',
  state: 'active',
  category: 'object',
  title: 'Mochila azul',
  description: 'Reporte de prueba.',
  city: 'La Paz',
  zone: 'Centro',
  incidentDate: '2026-10-10',
  createdAt: '2026-10-11T12:00:00.000Z',
  author: { id: 'owner-1', displayName: 'Santiago Demo' },
  imageUrls: [],
}

test('el resumen muestra hasta tres reportes activos en el orden del catálogo', async () => {
  const presenter = new CatalogPresenter({
    list: async () => [
      { ...summary, id: 'resolved', state: 'resolved' },
      { ...summary, id: 'recent' },
      { ...summary, id: 'next' },
      { ...summary, id: 'third' },
      { ...summary, id: 'oldest' },
    ],
  })

  await presenter.load()
  const overview = presenter.overview()
  assert.ok(overview.status === 'ready')

  assert.deepEqual(
    overview.recent.map(({ id, source }) => ({ id, source })),
    [
      { id: 'recent', source: 'catalog' },
      { id: 'next', source: 'catalog' },
      { id: 'third', source: 'catalog' },
    ],
  )
})

test('el resumen cuenta las ciudades reales y explica el límite del catálogo', async () => {
  const presenter = new CatalogPresenter({
    list: async () =>
      Array.from({ length: 50 }, (_, i): ReportSummary => ({
        ...summary,
        id: String(i),
        city: i < 30 ? 'La Paz' : 'Sucre',
        type: i < 30 ? 'lost' : 'found',
      })),
  })

  await presenter.load()
  const overview = presenter.overview()
  assert.ok(overview.status === 'ready')

  assert.deepEqual(overview.metrics, [
    { label: 'Reportes activos', value: 50 },
    { label: 'Perdidos', value: 30 },
    { label: 'Encontrados', value: 20 },
  ])
  assert.deepEqual(overview.cities, [
    { city: 'La Paz', count: 30 },
    { city: 'Sucre', count: 20 },
  ])
  assert.equal(overview.limitMessage, 'El resumen abarca los 50 reportes activos más recientes.')
})

test('el resumen distingue carga, error y un catálogo vacío al reintentar', async () => {
  let unavailable = true
  const presenter = new CatalogPresenter({
    list: async () => {
      if (unavailable) throw new Error('network')
      return []
    },
  })
  const loading = presenter.load()
  assert.deepEqual(presenter.overview(), { status: 'loading' })
  await loading
  assert.deepEqual(presenter.overview(), {
    status: 'error',
    message: 'No se pudo cargar el resumen. Intenta nuevamente.',
  })

  unavailable = false
  await presenter.load()
  assert.deepEqual(presenter.overview(), { status: 'empty' })
})

test('solo una consulta general puede alimentar el resumen', async () => {
  const presenter = new CatalogPresenter({ list: async () => [summary] })

  await presenter.load({ ...defaultSelection, search: 'Mochila' })
  assert.equal(presenter.isGeneralQuery(), false)
  await presenter.load({ ...defaultSelection, urlError: 'El enlace contiene filtros inválidos.' })
  assert.equal(presenter.isGeneralQuery(), false)

  await presenter.load(defaultSelection)
  assert.equal(presenter.isGeneralQuery(), true)
})

test('el catálogo pasa de carga a datos públicos y conserva el identificador persistido', async () => {
  let resolve!: (reports: ReportSummary[]) => void
  const response = new Promise<ReportSummary[]>((done) => {
    resolve = done
  })
  const presenter = new CatalogPresenter({ list: async () => response })
  const loading = presenter.load()
  assert.equal(presenter.getSnapshot().status, 'loading')
  resolve([summary])
  await loading
  const state = presenter.getSnapshot()
  assert.equal(state.status, 'ready')
  assert.deepEqual(
    state.reports.map((report: { id: string; source: string; person: string; status: string }) => ({
      id: report.id,
      source: report.source,
      person: report.person,
      status: report.status,
    })),
    [{ id: summary.id, source: 'catalog', person: 'Santiago Demo', status: 'Encontrado' }],
  )
  assert.ok(!/phone|position|ownerId/.test(JSON.stringify(state)))
})

test('un fallo muestra error sin fixtures y reintentar puede terminar en un catálogo vacío', async () => {
  let failed = true
  const presenter = new CatalogPresenter({
    list: async () => {
      if (failed) throw new Error('private-network-sentinel')
      return []
    },
  })
  await presenter.load()
  assert.deepEqual(presenter.getSnapshot(), {
    status: 'error',
    reports: [],
    message: 'No se pudo cargar el catálogo. Intenta nuevamente.',
  })
  failed = false
  await presenter.load()
  assert.deepEqual(presenter.getSnapshot(), { status: 'ready', reports: [] })
})

test('una respuesta anterior no reemplaza el catálogo del último reintento', async () => {
  let resolveOld!: (reports: ReportSummary[]) => void
  const old = new Promise<ReportSummary[]>((done) => {
    resolveOld = done
  })
  let calls = 0
  const presenter = new CatalogPresenter({ list: async () => (++calls === 1 ? old : [summary]) })
  const previous = presenter.load()
  await presenter.load()
  resolveOld([])
  await previous
  assert.equal(presenter.getSnapshot().reports.length, 1)
})

test('cancelar impide que una respuesta pendiente publique estado después de desmontar', async () => {
  let resolve!: (reports: ReportSummary[]) => void
  const response = new Promise<ReportSummary[]>((done) => {
    resolve = done
  })
  const presenter = new CatalogPresenter({ list: async () => response })
  const pending = presenter.load()
  presenter.cancel()
  resolve([summary])
  await pending
  assert.deepEqual(presenter.getSnapshot(), { status: 'loading', reports: [] })
})

test('el cliente HTTP valida el DTO y nunca conserva campos privados adicionales', async () => {
  const client = createReportsClient(
    '/api',
    async () =>
      new Response(
        JSON.stringify([
          {
            ...summary,
            phone: 'private-sentinel',
            author: { ...summary.author, email: 'private-sentinel' },
          },
        ]),
      ),
  )
  expect(await client.list(new AbortController().signal)).toStrictEqual([summary])
})

test('el cliente HTTP rechaza respuestas erróneas, IDs numéricos, fechas y URLs inválidas', async () => {
  for (const data of [
    {},
    [{ ...summary, id: 1 }],
    [{ ...summary, type: 'resolved' }],
    [{ ...summary, state: 'resolved' }],
    [{ ...summary, category: 'invalid' }],
    [{ ...summary, incidentDate: '2026-02-31' }],
    [{ ...summary, createdAt: 'ayer' }],
    [{ ...summary, imageUrls: ['javascript:alert(1)'] }],
  ]) {
    const client = createReportsClient('/api', async () => new Response(JSON.stringify(data)))
    await assert.rejects(client.list(new AbortController().signal), {
      message: 'La respuesta del catálogo no es válida.',
    })
  }
  const failed = createReportsClient('/api', async () => new Response('', { status: 503 }))
  await assert.rejects(failed.list(new AbortController().signal), {
    message: 'No se pudo consultar el catálogo.',
  })
})

test('la búsqueda del presenter combina selecciones, reintenta la misma consulta y limpiar restaura el catálogo', async () => {
  const queries: unknown[] = []
  let fail = true
  const presenter = new CatalogPresenter({
    list: async (_signal, query) => {
      queries.push(query)
      if (fail) throw new Error('network')
      return [summary]
    },
  })
  await presenter.load({
    search: '  CÁMARA  ',
    city: 'La Paz',
    zone: '  San José ',
    category: 'Objeto',
    status: 'Perdido',
    dateFrom: '2026-10-10',
    dateTo: '2026-10-11',
  })
  assert.equal(presenter.getSnapshot().status, 'error')
  fail = false
  await presenter.load()
  assert.equal(presenter.getSnapshot().status, 'ready')
  await presenter.load({
    search: '',
    city: '',
    zone: '',
    category: 'Todas las categorías',
    status: 'Todos',
  })
  assert.deepEqual(queries, [
    {
      q: 'CÁMARA',
      city: 'La Paz',
      zone: 'San José',
      category: 'object',
      type: 'lost',
      dateFrom: '2026-10-10',
      dateTo: '2026-10-11',
    },
    {
      q: 'CÁMARA',
      city: 'La Paz',
      zone: 'San José',
      category: 'object',
      type: 'lost',
      dateFrom: '2026-10-10',
      dateTo: '2026-10-11',
    },
    {},
  ])
})

test('el cliente codifica texto y filtros como parámetros HTTP y omite los filtros ausentes', async () => {
  const requests: string[] = []
  const controller = new AbortController()
  const client = createReportsClient('/api/', async (input, init) => {
    requests.push(String(input))
    assert.equal(init?.signal, controller.signal)
    return new Response('[]')
  })
  await client.list(controller.signal, {
    q: "Cámara O'Reilly & 100%_",
    type: 'found',
    category: 'object',
    city: 'La Paz',
    zone: 'San José %_',
    dateFrom: '2026-10-10',
    dateTo: '2026-10-11',
  })
  await client.list(controller.signal)
  const url = new URL(requests[0]!, 'http://localhost')
  assert.equal(url.pathname, '/api/reports')
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    q: "Cámara O'Reilly & 100%_",
    type: 'found',
    category: 'object',
    city: 'La Paz',
    zone: 'San José %_',
    dateFrom: '2026-10-10',
    dateTo: '2026-10-11',
  })
  assert.equal(requests[1], '/api/reports')
})

test('el rango del hecho se consulta al validarse, un error se conserva sin llamar al API y limpiar lo vacía', () => {
  const queries: unknown[] = []
  const catalog = new CatalogPresenter({
    list: async (_signal, query) => {
      queries.push(query)
      return []
    },
  })
  const filters = new FiltersPresenter((selection) => void catalog.load(selection))

  filters.setDateFrom('2026-10-10')
  filters.setDateTo('2026-10-10')
  filters.setDateFrom('2026-10-11')

  assert.deepEqual(filters.getSnapshot(), {
    ...defaultSelection,
    dateFrom: '2026-10-11',
    dateTo: '2026-10-10',
    dateError: 'La fecha «Desde» debe ser anterior o igual a «Hasta».',
  })
  assert.deepEqual(queries, [
    { dateFrom: '2026-10-10' },
    { dateFrom: '2026-10-10', dateTo: '2026-10-10' },
  ])
  assert.deepEqual(catalog.getSnapshot(), { status: 'ready', reports: [] })

  filters.setDateTo('2026-10-11')
  filters.reset()
  assert.deepEqual(queries, [
    { dateFrom: '2026-10-10' },
    { dateFrom: '2026-10-10', dateTo: '2026-10-10' },
    { dateFrom: '2026-10-11', dateTo: '2026-10-11' },
    {},
  ])
  assert.equal(filters.getSnapshot().dateFrom, '')
  assert.equal(filters.getSnapshot().dateTo, '')
  assert.equal(filters.getSnapshot().dateError, undefined)
})

test('reintentar o refrescar no recupera una búsqueda anterior mientras el rango sea inválido', async () => {
  const queries: unknown[] = []
  const catalog = new CatalogPresenter({
    list: async (_signal, query) => {
      queries.push(query)
      return [summary]
    },
  })
  await catalog.load({ ...defaultSelection, dateFrom: '2026-10-10' })
  await catalog.load({
    ...defaultSelection,
    dateFrom: '2026-10-11',
    dateTo: '2026-10-10',
  })
  await catalog.load()

  assert.deepEqual(queries, [{ dateFrom: '2026-10-10' }])
  assert.deepEqual(catalog.getSnapshot(), { status: 'ready', reports: [] })
})

test('una fecha inválida del control nativo muestra error sin buscar y permite corregir o limpiar', () => {
  const queries: unknown[] = []
  const catalog = new CatalogPresenter({
    list: async (_signal, query) => {
      queries.push(query)
      return []
    },
  })
  const filters = new FiltersPresenter((selection) => void catalog.load(selection))

  filters.setDateFrom('2026-02-28')
  // Native date inputs expose an impossible/partial date as an empty value with badInput=true.
  filters.setDateFrom('', true)
  assert.equal(filters.getSnapshot().dateError, 'Indica fechas válidas para el periodo.')
  assert.deepEqual(queries, [{ dateFrom: '2026-02-28' }])
  assert.deepEqual(catalog.getSnapshot(), { status: 'ready', reports: [] })

  filters.setDateFrom('2026-02-27')
  filters.setDateFrom('2026-02-27')
  assert.equal(filters.getSnapshot().dateError, undefined)
  assert.deepEqual(queries.at(-1), { dateFrom: '2026-02-27' })
  filters.setDateTo('', true)
  assert.equal(filters.getSnapshot().dateError, 'Indica fechas válidas para el periodo.')
  assert.equal(queries.length, 2)
  filters.reset()
  assert.equal(filters.getSnapshot().dateFrom, '')
  assert.equal(filters.getSnapshot().dateTo, '')
  assert.equal(filters.getSnapshot().dateError, undefined)
  assert.deepEqual(queries.at(-1), {})
})

test('cambiar el rango cancela la consulta anterior y descarta tanto su resultado como su error', async () => {
  for (const staleFails of [false, true]) {
    let finishOld!: (reports: ReportSummary[]) => void
    let failOld!: (error: Error) => void
    const old = new Promise<ReportSummary[]>((resolve, reject) => {
      finishOld = resolve
      failOld = reject
    })
    const signals: AbortSignal[] = []
    const presenter = new CatalogPresenter({
      list: async (signal, query) => {
        signals.push(signal)
        return query?.dateFrom === '2026-10-10' ? old : [summary]
      },
    })
    const previous = presenter.load({
      search: 'camara',
      city: '',
      zone: '',
      category: 'Todas las categorías',
      status: 'Todos',
      dateFrom: '2026-10-10',
      dateTo: '2026-10-12',
    })
    await presenter.load({
      search: 'camara',
      city: 'La Paz',
      zone: '',
      category: 'Objeto',
      status: 'Encontrado',
      dateFrom: '2026-10-11',
      dateTo: '2026-10-12',
    })
    assert.equal(signals[0]!.aborted, true)
    assert.equal(signals[1]!.aborted, false)
    if (staleFails) failOld(new Error('stale-error'))
    else finishOld([])
    await previous
    assert.equal(presenter.getSnapshot().status, 'ready')
    assert.deepEqual(
      presenter.getSnapshot().reports.map(({ id }) => id),
      [summary.id],
    )
  }
})
