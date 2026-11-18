import assert from 'node:assert/strict'

const title = 'Cámara de prueba perdida'
const reportPath = '/reportes/30000000-0000-0000-0000-000000000001'
const query = new URLSearchParams({
  q: 'camara',
  type: 'lost',
  category: 'object',
  city: 'La Paz',
  zone: 'san jose',
  dateFrom: '2026-10-10',
  dateTo: '2026-10-10',
})

export async function openMap(page) {
  const menu = page.getByRole('button', { name: 'Abrir menú', exact: true })
  if (await menu.isVisible()) await menu.click()
  await page.getByRole('navigation').getByRole('button', { name: 'Mapa', exact: true }).click()
  await page.getByRole('heading', { name: 'Mapa de reportes', exact: true }).waitFor()
}

export async function verifyMapCatalog(browser, webUrl, size, viewport) {
  const context = await browser.newContext({ viewport, hasTouch: size === 'mobile' })
  const page = await context.newPage()
  const errors = []
  const requests = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (request.method() === 'GET' && url.pathname === '/api/reports') requests.push(url.search)
  })
  const failure = Promise.withResolvers()
  try {
    const searchUrl = `${webUrl}/?${query}`
    await page.goto(searchUrl)
    await page.getByRole('button', { name: title, exact: true }).waitFor()
    const catalogTitles = await page.locator('.card-title').allTextContents()
    assert.deepEqual(catalogTitles, [title])
    const requestCount = requests.length

    await openMap(page)
    const text = page.getByRole('textbox', { name: 'Buscar reportes' })
    const list = page.getByRole('list', { name: 'Ubicaciones reportadas' })
    const row = list.getByRole('button', { name: new RegExp(title) })
    await row.waitFor()
    assert.deepEqual(await list.locator('li b').allTextContents(), catalogTitles)
    assert.match(await row.textContent(), /Perdido.*La Paz · San José/s)
    assert.match(await page.locator('.result-count').textContent(), /^1 /)
    assert.equal(await text.inputValue(), 'camara')
    assert.equal(requests.length, requestCount, 'cambiar de sección reutiliza la respuesta')
    assert.equal(await page.locator('.map-pin, .map-canvas').count(), 0)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    await page.screenshot({ path: `test-results/map-catalog-${size}.png`, fullPage: true })

    const dialog = page.getByRole('dialog')
    for (const back of [true, false]) {
      await row.click()
      await dialog.getByRole('heading', { name: title, exact: true }).waitFor()
      const url = new URL(page.url())
      assert.equal(url.pathname, reportPath)
      assert.equal(url.search, '')
      if (back) await page.goBack()
      else await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click()
      await dialog.waitFor({ state: 'detached' })
      await row.waitFor()
      assert.equal(page.url(), searchUrl)
      assert.equal(await text.inputValue(), 'camara')
      assert.ok(await row.evaluate((element) => document.activeElement === element))
    }
    assert.equal(requests.length, requestCount)

    let failOnce = true
    await page.route('**/api/reports?*', async (route) => {
      if (failOnce && new URL(route.request().url()).searchParams.get('q') === 'CÁMARA') {
        failOnce = false
        await failure.promise
        return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
      }
      return route.continue()
    })
    await text.fill('CÁMARA')
    await page.getByRole('status').filter({ hasText: 'Cargando reportes' }).waitFor()
    assert.equal(await list.count(), 0)
    failure.resolve()
    await page.getByRole('alert').filter({ hasText: 'No se pudo cargar el catálogo' }).waitFor()
    const failedUrl = page.url()
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
    await row.waitFor()
    assert.equal(page.url(), failedUrl)
    assert.equal(await text.inputValue(), 'CÁMARA')
    assert.equal(requests.at(-1), requests.at(-2), 'reintenta la misma consulta')

    await text.fill('sin-coincidencias-de-prueba')
    await page.getByRole('heading', { name: 'No se encontraron coincidencias' }).waitFor()
    assert.equal(await list.count(), 0)
    await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click()
    await list.getByRole('button', { name: /Gato de prueba perdido/ }).waitFor()
    assert.equal(new URL(page.url()).search, '')
    assert.equal(await text.inputValue(), '')
    assert.equal(await list.getByText('Cámara de prueba devuelta').count(), 0)
    assert.ok((await list.getByRole('listitem').count()) > 1)
    assert.deepEqual(errors, [])
    console.log(`Mapa ${size}: consulta compartida, retorno, carga, error, reintento y limpieza.`)
  } catch (error) {
    await page.screenshot({ path: `test-results/map-catalog-failed-${size}.png`, fullPage: true })
    throw error
  } finally {
    failure.resolve()
    await context.close()
  }
}
