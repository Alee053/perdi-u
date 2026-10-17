import assert from 'node:assert/strict'
import { expect, test } from '@jest/globals'
import type { ReportSummary } from '@perdiu/contracts'
import { CatalogPresenter } from '../src/catalog/presenter.js'
import { createReportsClient } from '../src/catalog/client.js'

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
    category: 'Objeto',
    status: 'Perdido',
  })
  assert.equal(presenter.getSnapshot().status, 'error')
  fail = false
  await presenter.load()
  assert.equal(presenter.getSnapshot().status, 'ready')
  await presenter.load({
    search: '',
    city: 'Todas las ciudades',
    category: 'Todas las categorías',
    status: 'Todos',
  })
  assert.deepEqual(queries, [
    { q: 'CÁMARA', city: 'La Paz', category: 'object', type: 'lost' },
    { q: 'CÁMARA', city: 'La Paz', category: 'object', type: 'lost' },
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
  })
  await client.list(controller.signal)
  const url = new URL(requests[0]!, 'http://localhost')
  assert.equal(url.pathname, '/api/reports')
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    q: "Cámara O'Reilly & 100%_",
    type: 'found',
    category: 'object',
    city: 'La Paz',
  })
  assert.equal(requests[1], '/api/reports')
})

test('cambiar texto o filtros cancela la consulta anterior y descarta tanto su resultado como su error', async () => {
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
        return query?.q === 'camara' ? old : [summary]
      },
    })
    const previous = presenter.load({
      search: 'camara',
      city: 'Todas las ciudades',
      category: 'Todas las categorías',
      status: 'Todos',
    })
    await presenter.load({
      search: 'mochila',
      city: 'La Paz',
      category: 'Objeto',
      status: 'Encontrado',
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
