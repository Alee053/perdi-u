import assert from 'node:assert/strict'

const cat = '20000000-0000-0000-0000-000000000002'
const bag = '20000000-0000-0000-0000-000000000001'
const images = [
  '/images/pet.svg?gallery=1',
  '/images/pet.svg?gallery=2',
  '/images/gallery-missing.jpg',
]
const description =
  'Gato gris de prueba con collar azul. Se perdió cerca de la plaza y responde a su nombre.\n\n' +
  'Tiene una mancha blanca en el pecho. Si lo ves, consulta los datos del reporte para coordinar.\n' +
  '<strong>Este texto es parte de la descripción, sin interpretar HTML.</strong>'

/** UI acceptance reuses the real detail response and doubles only photos and descriptive data. */
export async function verifyReportGallery(browser, webUrl, size, viewport) {
  const context = await browser.newContext({
    viewport,
    timezoneId: size === 'desktop' ? 'Pacific/Honolulu' : 'Pacific/Kiritimati',
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const dialog = page.getByRole('dialog')
  const heading = dialog.getByRole('heading', { name: 'Gato de prueba perdido', exact: true })
  const choice = (index) =>
    dialog.getByRole('button', { name: `Ver foto ${index} de 3`, exact: true })
  const fact = (label) => dialog.getByText(label, { exact: true }).locator('..').locator('dd')
  try {
    await page.route(`**/api/reports/${cat}`, async (route) => {
      const response = await route.fetch()
      const report = await response.json()
      await route.fulfill({
        response,
        json: {
          ...report,
          description,
          incidentDate: '2026-10-09',
          createdAt: '2026-10-11T02:00:00Z',
          petSpecies: 'Gato doméstico',
          imageUrls: images,
        },
      })
    })
    await page.route('**/images/gallery-missing.jpg', (route) => route.fulfill({ status: 404 }))
    await page.goto(`${webUrl}/reportes/${cat}`)
    await heading.waitFor()
    const bounds = await dialog.boundingBox()
    await page.mouse.click(bounds.x + 10, bounds.y + 10)
    assert.equal(await heading.isVisible(), true, 'pulsar dentro del diálogo no lo cierra')
    assert.match(await fact('Fecha del hecho').textContent(), /^9 oct(?: de)? 2026$/)
    assert.match(await fact('Fecha de publicación').textContent(), /^10 oct(?: de)? 2026$/)
    assert.equal(await fact('Tipo').textContent(), 'Perdido')
    assert.equal(await fact('Estado').textContent(), 'Activo')
    assert.equal(await fact('Categoría').textContent(), 'Mascota')
    assert.equal(await fact('Especie').textContent(), 'Gato doméstico')
    assert.equal(await fact('Ciudad').textContent(), 'Cochabamba')
    assert.equal(await fact('Zona').textContent(), 'Cala Cala')
    await dialog.getByRole('heading', { name: 'Ubicación reportada', exact: true }).waitFor()
    assert.equal(await dialog.locator('.detail-description').textContent(), description)
    assert.equal(
      await dialog
        .locator('.detail-description')
        .evaluate((node) => getComputedStyle(node).whiteSpace),
      'pre-wrap',
    )
    assert.equal(await dialog.locator('.detail-description strong').count(), 0)
    assert.equal(await dialog.getByRole('img').getAttribute('src'), images[0])
    assert.equal(await choice(1).getAttribute('aria-pressed'), 'true')
    await choice(2).focus()
    await page.keyboard.press('Space')
    assert.equal(await choice(2).getAttribute('aria-pressed'), 'true')
    assert.equal(await dialog.getByRole('img').getAttribute('src'), images[1])
    await dialog.getByRole('button', { name: 'Foto siguiente', exact: true }).click()
    await dialog.getByRole('img', { name: 'Foto no disponible', exact: true }).waitFor()
    assert.equal(await choice(3).getAttribute('aria-pressed'), 'true')
    assert.equal(await heading.isVisible(), true, 'la imagen rota no oculta los datos')
    await dialog.getByRole('button', { name: 'Foto siguiente', exact: true }).click()
    await dialog
      .getByRole('img', { name: 'Foto 1 de 3: Gato de prueba perdido', exact: true })
      .waitFor()
    await page.waitForFunction(() => document.querySelector('dialog img')?.naturalWidth > 0)
    await dialog.getByRole('button', { name: 'Foto anterior', exact: true }).click()
    await dialog.getByRole('img', { name: 'Foto no disponible', exact: true }).waitFor()
    await choice(1).click()
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).focus()
    for (let step = 0; step < 12; step++) {
      await page.keyboard.press(step < 9 ? 'Tab' : 'Shift+Tab')
      assert.ok(
        await dialog.evaluate(
          (node) =>
            node.contains(document.activeElement) || document.activeElement === document.body,
        ),
        'el foco no entra en el contenido de la página que queda detrás',
      )
    }
    await dialog.evaluate((node) => {
      node.scrollTop = 0
    })
    await page.screenshot({ path: `test-results/report-gallery-${size}.png` })
    await heading.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `test-results/report-detail-${size}.png` })
    assert.ok(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth + 1))
    await page.reload()
    await heading.waitFor()
    assert.equal(
      await choice(1).getAttribute('aria-pressed'),
      'true',
      'recargar reinicia la galería',
    )

    let bagImages = [images[0]]
    await page.route(`**/api/reports/${bag}`, async (route) => {
      const response = await route.fetch()
      await route.fulfill({
        response,
        json: { ...(await response.json()), imageUrls: bagImages },
      })
    })
    await page.goto(`${webUrl}/reportes/${bag}`)
    await dialog.getByRole('heading', { name: 'Mochila azul encontrada', exact: true }).waitFor()
    assert.equal(await dialog.getByRole('group', { name: 'Seleccionar foto' }).count(), 0)
    bagImages = []
    await page.reload()
    await dialog.getByRole('heading', { name: 'Mochila azul encontrada', exact: true }).waitFor()
    await dialog.getByText('Imagen de referencia de categoría', { exact: true }).waitFor()
    assert.equal(await dialog.getByRole('img').getAttribute('src'), '/images/object.svg')
    assert.equal(await dialog.getByRole('group', { name: 'Seleccionar foto' }).count(), 0)
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'detached' })
    if (size === 'mobile') await page.getByRole('button', { name: 'Abrir menú' }).click()
    await page
      .getByRole('navigation')
      .getByRole('button', { name: /^Explorar reportes/ })
      .click()
    const opener = page.getByRole('button', { name: 'Gato de prueba perdido', exact: true })
    await opener.focus()
    await page.keyboard.press('Enter')
    await heading.waitFor()
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'detached' })
    assert.ok(await opener.evaluate((node) => node === document.activeElement), 'recupera el foco')
    assert.deepEqual(errors, [])
  } catch (error) {
    await page.screenshot({ path: `test-results/report-gallery-failed-${size}.png` })
    console.error(await dialog.textContent().catch(() => 'Detalle cerrado durante el fallo.'))
    throw error
  } finally {
    await context.close()
  }
}
