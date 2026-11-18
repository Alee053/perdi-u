import assert from 'node:assert/strict'

export const overviewAuthorPhotos = {
  available: '/__test-author/available.svg',
  missing: '/__test-author/missing.svg',
}

const photoFixture = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="#d2e9de" d="M0 0h24v24H0z"/>
  <circle fill="#22634c" cx="12" cy="8" r="4"/>
  <path fill="#22634c" d="M4 22v-2a8 7 0 0 1 16 0v2z"/>
</svg>`

export async function verifyOverview(browser, webUrl, size, viewport, { bag, cat }) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const errors = []
  const photoRequests = []
  page.on('pageerror', (error) => errors.push(error.message))
  const main = page.getByRole('main')
  const cards = main.locator('.report-card')
  const titles = ['Mochila azul encontrada', 'Gato de prueba perdido']
  const dialog = page.getByRole('dialog')
  const author = dialog.getByText('Publicado por', { exact: true }).locator('..').locator('dd')
  const loadedAvatar = async (scope) => {
    const image = scope.locator('img.user-avatar')
    await image.evaluate((element) => element.decode())
    assert.match(await image.getAttribute('src'), /^blob:/)
  }
  const missingPhoto = () =>
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === overviewAuthorPhotos.missing &&
        response.status() === 404,
    )

  try {
    await context.addCookies([{ name: 'author-photo-fixture', value: 'test', url: webUrl }])
    await page.route('**/__test-author/*', async (route) => {
      const request = route.request()
      const headers = await request.allHeaders()
      photoRequests.push({
        cookie: headers.cookie !== undefined,
        auth: headers.authorization !== undefined,
      })
      if (new URL(request.url()).pathname === overviewAuthorPhotos.available)
        return route.fulfill({ contentType: 'image/svg+xml', body: photoFixture })
      await route.fulfill({ status: 404 })
    })
    await page.route('**/api/reports', (route) => route.fulfill({ status: 503 }), { times: 1 })
    await page.goto(webUrl)
    await main.getByRole('alert').filter({ hasText: 'No se pudo cargar el resumen' }).waitFor()
    assert.equal(await cards.count(), 0)
    const missingInCard = missingPhoto()
    await main.getByRole('button', { name: 'Reintentar', exact: true }).click()
    await main.getByRole('heading', { name: 'Reportes recientes', exact: true }).waitFor()
    assert.deepEqual(await main.locator('.card-title').allTextContents(), titles)
    const summary = main.getByRole('region', { name: 'Resumen de reportes' })
    assert.deepEqual(await summary.locator('dt').allTextContents(), [
      'Reportes activos',
      'Perdidos',
      'Encontrados',
    ])
    assert.deepEqual(await summary.locator('dd').allTextContents(), ['2', '1', '1'])
    await summary.getByText('La Paz: 1', { exact: true }).waitFor()
    await summary.getByText('Cochabamba: 1', { exact: true }).waitFor()
    await cards.first().getByText('Santiago Demo', { exact: true }).waitFor()
    await loadedAvatar(cards.first())
    await missingInCard
    await cards.last().getByText('Autora de prueba', { exact: true }).waitFor()
    await cards.last().locator('span.user-avatar').waitFor()
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    await page.screenshot({ path: `test-results/overview-${size}.png`, fullPage: true })

    await cards.first().getByRole('button', { name: titles[0], exact: true }).click()
    await dialog.getByRole('heading', { name: titles[0], exact: true }).waitFor()
    assert.equal(page.url(), `${webUrl}/reportes/${bag}`)
    await author.getByText('Santiago Demo', { exact: true }).waitFor()
    await loadedAvatar(author)
    await author.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `test-results/report-author-${size}.png` })
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click()

    const missingInDetail = missingPhoto()
    await cards.last().getByRole('button', { name: titles[1], exact: true }).click()
    await dialog.getByRole('heading', { name: titles[1], exact: true }).waitFor()
    assert.equal(page.url(), `${webUrl}/reportes/${cat}`)
    await missingInDetail
    await author.getByText('Autora de prueba', { exact: true }).waitFor()
    await author.locator('span.user-avatar').waitFor()
    await dialog
      .getByRole('figure', { name: 'Fotos del reporte' })
      .getByRole('img')
      .evaluate((image) => image.decode())
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click()

    await main.getByRole('button', { name: 'Explorar reportes', exact: true }).click()
    await main.getByRole('heading', { name: 'Explorar reportes', exact: true }).waitFor()
    assert.deepEqual(await main.locator('.card-title').allTextContents(), titles)
    assert.ok(photoRequests.length >= 4)
    assert.ok(photoRequests.every(({ cookie, auth }) => !cookie && !auth))
    assert.deepEqual(errors, [])
  } finally {
    await context.close()
  }
}
