import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import type { ReportQuery } from '@perdiu/contracts'
import type { SearchLocation, SearchNavigation } from '../../src/models/reports/search-location.js'
import { CatalogPresenter } from '../../src/presenters/catalog/catalog.presenter.js'
import { allCities, FiltersPresenter } from '../../src/presenters/catalog/filters.presenter.js'
import { CatalogSearchPresenter } from '../../src/presenters/catalog/search.presenter.js'

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
function setup(initial: SearchLocation | undefined) {
  let location = initial
  let listener: ((location: SearchLocation | undefined) => void) | undefined
  const replaced: ReportQuery[] = []
  const navigation: SearchNavigation = {
    current: () => location,
    replace: (query) => {
      replaced.push({ ...query })
      location = { query, invalid: false }
    },
    onChange: (next) => {
      listener = next
      return () => {
        listener = undefined
      }
    },
  }
  const queries: ReportQuery[] = []
  const catalog = new CatalogPresenter({
    list: async (_signal, query) => {
      queries.push(query ?? {})
      return []
    },
  })
  const filters = new FiltersPresenter()
  let opened = 0
  const search = new CatalogSearchPresenter({
    filters,
    catalog,
    navigation,
    onSearch: () => {
      opened++
    },
  })
  return {
    search,
    filters,
    catalog,
    queries,
    replaced,
    opened: () => opened,
    navigate: (next: SearchLocation | undefined) => {
      location = next
      listener?.(next)
    },
  }
}

test('restaura los controles antes de una única consulta y reemplaza la búsqueda al editar o limpiar', async () => {
  const query = {
    q: 'CÁMARA',
    type: 'lost' as const,
    category: 'object' as const,
    city: 'Tarija',
    zone: 'San José',
    dateFrom: '2026-10-01',
    dateTo: '2026-10-31',
  }
  const { search, filters, queries, replaced } = setup({ query, invalid: false })
  const firstStop = search.start()
  assert.equal(filters.getSnapshot().search, query.q)
  assert.equal(filters.getSnapshot().city, 'Tarija')
  assert.equal(filters.getSnapshot().category, 'Objeto')
  assert.equal(filters.getSnapshot().status, 'Perdido')
  assert.equal(filters.getSnapshot().dateFrom, query.dateFrom)
  assert.equal(queries.length, 0, 'no consulta antes de terminar la restauración')
  firstStop()
  const stop = search.start()
  await settle()
  assert.deepEqual(queries, [query], 'el montaje repetido no duplica la carga inicial')
  assert.ok(
    filters.options().cities.includes('Tarija'),
    'la ciudad del enlace tiene un control visible',
  )
  filters.setZone('Miraflores')
  await settle()
  assert.deepEqual(queries.at(-1), { ...query, zone: 'Miraflores' })
  assert.deepEqual(replaced.at(-1), { ...query, zone: 'Miraflores' })
  filters.reset()
  await settle()
  assert.deepEqual(queries.at(-1), {})
  assert.deepEqual(replaced.at(-1), {})
  stop()
})

test('un enlace inválido bloquea las consultas y conserva el aviso hasta corregir o limpiar', async () => {
  const { search, filters, catalog, queries, replaced, opened } = setup({
    query: {},
    invalid: true,
  })
  const stop = search.start()
  await settle()
  assert.ok(filters.getSnapshot().urlError, 'presenta un aviso sin reflejar los valores del enlace')
  assert.equal(opened(), 1, 'el aviso se ve en la búsqueda, también sin filtros válidos')
  assert.deepEqual(queries, [], 'no interpreta el enlace inválido como el catálogo general')
  assert.deepEqual(replaced, [], 'conserva la dirección inválida para poder corregirla')
  await catalog.load()
  assert.deepEqual(queries, [], 'un refresco tampoco reintenta la consulta anterior')
  filters.setSearch('cámara')
  await settle()
  assert.equal(filters.getSnapshot().urlError, undefined)
  assert.deepEqual(queries, [{ q: 'cámara' }])
  assert.deepEqual(replaced.at(-1), { q: 'cámara' })
  filters.reset()
  await settle()
  assert.deepEqual(queries.at(-1), {})
  stop()
})

test('volver del detalle conserva los resultados de la misma búsqueda y restaura otra entrada solo una vez', async () => {
  const { search, filters, queries, replaced, navigate } = setup({
    query: { q: 'gato' },
    invalid: false,
  })
  const stop = search.start()
  await settle()
  const writes = replaced.length
  navigate(undefined)
  assert.equal(replaced.length, writes, 'el detalle conserva su enlace canónico')
  navigate({ query: { q: 'gato' }, invalid: false })
  await settle()
  assert.deepEqual(
    queries,
    [{ q: 'gato' }],
    'conserva los resultados y el elemento que abrió el detalle',
  )
  navigate({ query: { q: 'mochila', dateTo: '2026-10-12' }, invalid: false })
  await settle()
  assert.equal(filters.getSnapshot().search, 'mochila')
  assert.deepEqual(queries.at(-1), { q: 'mochila', dateTo: '2026-10-12' })
  assert.equal(queries.length, 2)
  stop()
})

test('una ciudad del enlace que coincide con la opción general sigue siendo un filtro', async () => {
  const { search, filters, queries, replaced } = setup({
    query: { city: allCities },
    invalid: false,
  })
  const stop = search.start()
  await settle()
  assert.deepEqual(queries, [{ city: allCities }])
  assert.notEqual(
    filters.getSnapshot().city,
    allCities,
    'el control distingue ciudad y opción general',
  )
  assert.ok(filters.options().cities.includes(filters.getSnapshot().city))
  filters.setSearch('mochila')
  await settle()
  assert.deepEqual(replaced.at(-1), { q: 'mochila', city: allCities })
  filters.setCity(allCities)
  await settle()
  assert.deepEqual(queries.at(-1), { q: 'mochila' })
  assert.deepEqual(replaced.at(-1), { q: 'mochila' })
  stop()
})
