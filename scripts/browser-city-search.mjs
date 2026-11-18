import assert from 'node:assert/strict'
import { openMap } from './browser-map-catalog.mjs'

const keys = 'Llaves de prueba de Sucre'
const card = 'Carné de prueba de Sucre'
const literal = 'Bolso de prueba de ciudad literal'

async function expectTitles(page, titles) {
  for (const title of titles) await page.getByRole('button', { name: title, exact: true }).waitFor()
  assert.deepEqual((await page.locator('.card-title').allTextContents()).sort(), [...titles].sort())
}

export async function verifyCitySearch(browser, webUrl, size, viewport) {
  const context = await browser.newContext({ viewport, hasTouch: size === 'mobile' })
  const page = await context.newPage()
  try {
    await page.goto(webUrl)
    if (size === 'mobile') await page.getByRole('button', { name: 'Abrir menú' }).click()
    await page
      .getByRole('navigation')
      .getByRole('button', { name: /^Explorar reportes/ })
      .click()
    const limit = page.getByRole('status').filter({ hasText: 'Se muestran hasta 50 resultados' })
    await limit.waitFor()
    assert.equal(await page.locator('.report-card').count(), 50)
    assert.equal(await page.getByRole('button', { name: keys, exact: true }).count(), 0)

    const city = page.getByLabel('Ciudad', { exact: true })
    await city.pressSequentially('Sucre')
    await expectTitles(page, [keys, card])
    assert.deepEqual(
      await city.evaluate((input) => Array.from(input.list.options, ({ value }) => value)),
      ['La Paz', 'Cochabamba', 'Santa Cruz'],
    )
    assert.equal(await city.getAttribute('maxlength'), '100')
    await city.fill('sucre')
    await page.getByRole('heading', { name: 'No se encontraron coincidencias' }).waitFor()
    await city.fill('  Sucre  ')
    await page.getByRole('textbox', { name: 'Zona o barrio' }).fill('san jose')
    await page.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption('Objeto')
    await page.getByRole('tab', { name: 'Encontrados', exact: true }).click()
    await page.getByLabel('Desde', { exact: true }).fill('2026-10-10')
    await page.getByLabel('Hasta', { exact: true }).fill('2026-10-10')
    await expectTitles(page, [keys])
    const searchUrl = page.url()
    assert.equal(new URL(searchUrl).searchParams.get('city'), 'Sucre')
    await page.reload()
    await expectTitles(page, [keys])
    assert.equal(await city.inputValue(), 'Sucre')

    const linked = await context.newPage()
    await linked.goto(searchUrl)
    await expectTitles(linked, [keys])
    await openMap(linked)
    await linked.getByRole('list', { name: 'Ubicaciones reportadas' }).waitFor()
    assert.deepEqual(await linked.locator('.map-result b').allTextContents(), [keys])
    await linked.close()

    const clear = page.getByRole('button', { name: 'Limpiar filtros', exact: true })
    await clear.click()
    await limit.waitFor()
    assert.equal(await city.inputValue(), '')
    assert.equal(await city.getAttribute('placeholder'), 'Todas las ciudades')
    await city.fill('Todas las ciudades')
    await expectTitles(page, [literal])
    await page.reload()
    await expectTitles(page, [literal])
    assert.equal(await city.inputValue(), 'Todas las ciudades')
    await clear.click()
    await limit.waitFor()
    assert.equal(new URL(page.url()).search, '')
    assert.equal(await city.inputValue(), '')
    console.log(`Ciudad ${size}: texto editable, búsqueda exacta antes del límite y enlace.`)
  } catch (error) {
    await page.screenshot({ path: `test-results/city-search-failed-${size}.png`, fullPage: true })
    throw error
  } finally {
    await context.close()
  }
}
