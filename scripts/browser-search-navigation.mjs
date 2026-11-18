import assert from 'node:assert/strict'

const title = 'Cámara de prueba perdida'
const reportPath = '/reportes/30000000-0000-0000-0000-000000000001'
const query = {
  q: 'camara',
  type: 'lost',
  category: 'object',
  city: 'La Paz',
  zone: 'san jose',
  dateFrom: '2026-10-10',
  dateTo: '2026-10-10',
}
const searchPath = '/?' + new URLSearchParams(query)

async function expectSearch(page, text = query.q) {
  await page.getByRole('button', { name: title, exact: true }).waitFor()
  await page.locator('.catalog-state').waitFor({ state: 'detached' })
  assert.equal(await page.locator('.report-card').count(), 1)
  assert.equal(await page.getByRole('textbox', { name: 'Buscar reportes' }).inputValue(), text)
  assert.equal(await page.getByLabel('Ciudad', { exact: true }).inputValue(), query.city)
  assert.equal(await page.getByRole('textbox', { name: 'Zona o barrio' }).inputValue(), query.zone)
  assert.equal(
    await page.getByRole('combobox', { name: 'Categoría', exact: true }).inputValue(),
    'Objeto',
  )
  assert.equal(
    await page.getByRole('tab', { name: 'Perdidos', exact: true }).getAttribute('aria-selected'),
    'true',
  )
  assert.equal(await page.getByLabel('Desde', { exact: true }).inputValue(), query.dateFrom)
  assert.equal(await page.getByLabel('Hasta', { exact: true }).inputValue(), query.dateTo)
}

/** Public searches use the real API/isolated PostgreSQL; only one network error is deliberate. */
export async function verifySearchNavigation(browser, webUrl, size, viewport) {
  const context = await browser.newContext({
    viewport,
    timezoneId: size === 'mobile' ? 'Pacific/Kiritimati' : 'America/La_Paz',
  })
  const page = await context.newPage()
  const errors = []
  const queries = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname === '/api/reports' && request.method() === 'GET')
      queries.push(Object.fromEntries(url.searchParams))
  })
  try {
    await page.goto(webUrl + searchPath)
    await expectSearch(page)
    assert.deepEqual(queries, [query], 'la primera consulta ya está filtrada y no se duplica')
    await page.screenshot({ path: `test-results/search-url-${size}.png`, fullPage: true })
    await page.reload()
    await expectSearch(page)
    assert.deepEqual(queries, [query, query])
    const other = await context.newPage()
    await other.goto(page.url())
    await expectSearch(other)
    await other.close()

    const opener = page.getByRole('button', { name: title, exact: true })
    await opener.click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('heading', { name: title, exact: true }).waitFor()
    assert.equal(new URL(page.url()).pathname, reportPath)
    assert.equal(new URL(page.url()).search, '', 'el enlace del reporte es canónico')
    await page.goBack()
    await dialog.waitFor({ state: 'detached' })
    await expectSearch(page)
    assert.equal(new URL(page.url()).pathname + new URL(page.url()).search, searchPath)
    assert.equal(queries.length, 2, 'volver a la misma búsqueda conserva sus resultados')
    assert.ok(await opener.evaluate((node) => node === document.activeElement))

    if (size === 'mobile') await page.getByRole('button', { name: 'Abrir menú' }).click()
    const navigation = page.getByRole('navigation')
    await navigation.getByRole('button', { name: 'Resumen', exact: true }).click()
    await page
      .getByRole('region', { name: 'Resumen de reportes' })
      .getByText('6', { exact: true })
      .waitFor({ timeout: 5000 })
    assert.equal(await page.locator('.report-card').count(), 3)
    assert.deepEqual(queries, [query, query, {}], 'Resumen lee la consulta general por separado')
    assert.equal(new URL(page.url()).search, new URL(searchPath, webUrl).search)
    if (size === 'mobile') await page.getByRole('button', { name: 'Abrir menú' }).click()
    await navigation.getByRole('button', { name: /^Explorar reportes/ }).click()
    await expectSearch(page)
    assert.deepEqual(queries, [query, query, {}], 'volver a Explorar conserva la búsqueda')

    await page.goForward()
    await dialog.getByRole('heading', { name: title, exact: true }).waitFor()
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click()
    await page.waitForURL((url) => url.pathname === '/' && url.searchParams.get('q') === query.q)
    await expectSearch(page)
    await page.goForward()
    await dialog.getByRole('heading', { name: title, exact: true }).waitFor()
    await page.reload()
    await dialog.getByRole('heading', { name: title, exact: true }).waitFor()
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click()
    await page.waitForURL((url) => url.pathname === '/' && url.searchParams.get('q') === query.q)
    await expectSearch(page)

    const historyLength = await page.evaluate(() => history.length)
    const search = page.getByRole('textbox', { name: 'Buscar reportes' })
    await search.fill('cam')
    await search.fill('camara negra')
    await search.fill('camara')
    await expectSearch(page)
    assert.equal(await page.evaluate(() => history.length), historyLength)
    let failOnce = true
    await page.route('**/api/reports?*', async (route) => {
      if (failOnce && new URL(route.request().url()).searchParams.get('q') === 'cámara') {
        failOnce = false
        return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
      }
      return route.continue()
    })
    await search.fill('cámara')
    await page.locator('.catalog-state[role="alert"]').waitFor()
    const failedUrl = page.url()
    assert.equal(await search.inputValue(), 'cámara')
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
    await expectSearch(page, 'cámara')
    assert.equal(page.url(), failedUrl)
    await page.unroute('**/api/reports?*')

    const beforeInvalid = queries.length
    await page.goto(
      webUrl +
        '/?q=camara&q=mochila&type=bad&token=private-sentinel&redirect=https%3A%2F%2Fexternal.test',
    )
    await page
      .getByRole('alert')
      .filter({ hasText: 'El enlace contiene filtros inválidos' })
      .waitFor()
    assert.equal(queries.length, beforeInvalid)
    assert.equal(await page.locator('.report-card, .empty-state, .result-count').count(), 0)
    assert.ok(!(await page.content()).includes('private-sentinel'))
    assert.equal(new URL(page.url()).origin, new URL(webUrl).origin)
    await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click()
    await page.locator('.report-card').first().waitFor()
    assert.equal(new URL(page.url()).search, '')
    assert.equal(await search.inputValue(), '')

    const beforeRange = queries.length
    await page.goto(webUrl + '/?' + new URLSearchParams({ ...query, dateFrom: '2026-10-11' }))
    await page
      .getByRole('alert')
      .filter({ hasText: 'El enlace contiene filtros inválidos' })
      .waitFor()
    assert.equal(queries.length, beforeRange)
    assert.equal(await page.getByLabel('Desde', { exact: true }).inputValue(), '2026-10-11')
    await page.getByLabel('Desde', { exact: true }).fill('2026-10-10')
    await expectSearch(page)
    assert.equal(await page.getByRole('alert').count(), 0)
    await page.goto(
      webUrl +
        '/?' +
        new URLSearchParams({
          ...query,
          error: 'access_denied',
          error_description: 'private-sentinel',
        }),
    )
    await page.getByRole('heading', { name: 'Iniciar sesión', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Volver al catálogo', exact: true }).click()
    await expectSearch(page)
    assert.ok(!(await page.content()).includes('private-sentinel'))
    assert.equal(new URL(page.url()).searchParams.has('error'), false)
    assert.deepEqual(errors, [])
    console.log(
      `URL de búsqueda ${size}: restauración, historial, privacidad y reintento verificados.`,
    )
  } catch (error) {
    await page.screenshot({ path: `test-results/search-url-failed-${size}.png`, fullPage: true })
    throw error
  } finally {
    await context.close()
  }
}
