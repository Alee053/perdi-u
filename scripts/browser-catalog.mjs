import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
// cross-spawn resolves pnpm's .cmd shim on Windows without passing arguments through a shell.
import { spawn } from 'cross-spawn'
import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { chromium } from 'playwright'
import { createPool } from '@perdiu/database'
import { assertLocalDatabase } from '@perdiu/database/config'

async function freePort() {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
  return port
}

function start(command, args, cwd, env) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'ignore',
    detached: true,
  })
  child.on('error', () => {
    child.startFailed = true
  })
  return child
}

async function stop(child) {
  if (
    !child ||
    child.startFailed ||
    !child.pid ||
    child.exitCode !== null ||
    child.signalCode !== null
  )
    return
  const exited = new Promise((resolve) => child.once('exit', resolve))
  // Windows has no POSIX process groups: end the whole tree with taskkill instead.
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    } catch {}
    return void (await exited)
  }
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch (error) {
    if (error.code !== 'ESRCH') throw error
  }
  let timer
  await Promise.race([
    exited,
    new Promise((resolve) => {
      timer = setTimeout(resolve, 3000)
    }),
  ])
  clearTimeout(timer)
  if (child.exitCode === null && child.signalCode === null) {
    process.kill(-child.pid, 'SIGKILL')
    await exited
  }
}

async function waitFor(url, child) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.startFailed || child.exitCode !== null || child.signalCode !== null)
      throw new Error('No se pudo iniciar un servidor de pruebas.')
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) })
      if (response.ok) return
    } catch {
      /* Retry connection while the local process starts. */
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('El servidor de pruebas no estuvo disponible en 20 segundos.')
}

const executablePath =
  process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
const launch = () =>
  chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const databaseUrl = process.env.TEST_DATABASE_URL
assert.ok(
  databaseUrl && process.env.PERDIU_TEST_CONTAINER === '1',
  'Usa pnpm test:e2e para ejecutar este recorrido en una BD aislada.',
)
assertLocalDatabase(databaseUrl)
const apiPort = await freePort()
const webPort = await freePort()
const apiUrl = `http://127.0.0.1:${apiPort}`
const webUrl = `http://127.0.0.1:${webPort}`
// The public catalog never consults Auth; these values only satisfy the API's configuration.
const apiEnv = {
  DATABASE_URL: databaseUrl,
  PORT: String(apiPort),
  HOST: '127.0.0.1',
  AUTH_JWKS_URL: 'http://127.0.0.1:9/.well-known/jwks.json',
  AUTH_JWT_ISSUER: 'http://127.0.0.1/auth',
}
const startApi = () =>
  start(process.execPath, ['dist/main.js'], new URL('../apps/api/', import.meta.url), apiEnv)
let api
let web
let browser
const pool = createPool(databaseUrl)
const pageErrors = []

async function openCatalog(page) {
  await page.goto(webUrl)
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /^Explorar reportes/ })
    .click()
}

async function expectCatalog(page) {
  await page.locator('.report-card').first().waitFor()
  assert.deepEqual((await page.locator('.card-title').allTextContents()).sort(), [
    'Gato de prueba perdido',
    'Mochila azul encontrada',
  ])
  assert.equal(await page.getByText('Documento de prueba devuelto').count(), 0)
  assert.equal(await page.getByText('Luna, mi compañera de aventuras', { exact: true }).count(), 0)
}

async function expectTitles(page, titles) {
  await page.waitForFunction((expected) => {
    const actual = [...document.querySelectorAll('.card-title')]
      .map((card) => card.textContent)
      .sort()
    return (
      JSON.stringify(actual) === JSON.stringify(expected.toSorted()) &&
      !document.querySelector('.catalog-state')
    )
  }, titles)
}

async function verifySearch(page, size) {
  const search = page.getByRole('textbox', { name: 'Buscar reportes' })
  const camera = ['Cámara de prueba perdida', 'Perrita de prueba encontrada']
  const query = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname === '/api/reports' && url.searchParams.get('q') === 'camara'
  })
  await search.fill('camara')
  assert.equal((await query).status(), 200)
  await expectTitles(page, camera)
  await search.fill('CÁMARA')
  await expectTitles(page, camera)
  await page.getByRole('tab', { name: 'Perdidos', exact: true }).click()
  await page.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption('Objeto')
  await page.getByRole('combobox', { name: 'Ciudad', exact: true }).selectOption('La Paz')
  await expectTitles(page, ['Cámara de prueba perdida'])
  await page.getByRole('combobox', { name: 'Ciudad', exact: true }).selectOption('Cochabamba')
  await page
    .getByRole('heading', { name: 'No se encontraron coincidencias', exact: true })
    .waitFor()
  assert.ok(
    await page
      .locator('.empty-state')
      .getByRole('button', { name: 'Publicar reporte', exact: true })
      .isVisible(),
  )
  await page
    .locator('.empty-state')
    .getByRole('button', { name: 'Publicar reporte', exact: true })
    .click()
  // Publishing requires an account: anonymous visitors are sent to the login screen.
  await page.getByRole('heading', { name: 'Iniciar sesión', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Volver al catálogo', exact: true }).click()
  // The profile shows private account data, so it asks for a session as well.
  if (size === 'mobile') await page.getByRole('button', { name: 'Abrir menú' }).click()
  await page.getByRole('navigation').getByRole('button', { name: 'Mi perfil' }).click()
  await page.getByRole('heading', { name: 'Iniciar sesión', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Volver al catálogo', exact: true }).click()
  if (size === 'mobile') await page.getByRole('button', { name: 'Abrir menú' }).click()
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /^Explorar reportes/ })
    .click()
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click()
  await expectTitles(page, [
    'Cámara de prueba perdida',
    'Perrita de prueba encontrada',
    'Carné de prueba encontrado',
    "Libro de prueba O'Reilly",
    'Mochila azul encontrada',
    'Gato de prueba perdido',
  ])
  assert.equal(await search.inputValue(), '')
  assert.equal(
    await page.getByRole('combobox', { name: 'Ciudad', exact: true }).inputValue(),
    'Todas las ciudades',
  )
  assert.equal(
    await page.getByRole('combobox', { name: 'Categoría', exact: true }).inputValue(),
    'Todas las categorías',
  )
  assert.equal(
    await page.getByRole('tab', { name: 'Todos', exact: true }).getAttribute('aria-selected'),
    'true',
  )
  await page.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption('Documentos')
  await expectTitles(page, ['Carné de prueba encontrado'])
  await page.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption('Mascota')
  await page.getByRole('tab', { name: 'Encontrados', exact: true }).click()
  await expectTitles(page, ['Perrita de prueba encontrada'])
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click()
  await search.fill('cam')
  await search.fill('camara')
  await search.fill('mochila')
  await expectTitles(page, ['Mochila azul encontrada'])
  await page.getByRole('button', { name: 'Guardar reporte', exact: true }).click()
  await search.fill('camara')
  await expectTitles(page, camera)
  if (size === 'mobile') await page.getByRole('button', { name: 'Abrir menú' }).click()
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /^Guardados/ })
    .click()
  const savedCard = page.locator('.report-card').filter({ hasText: 'Mochila azul encontrada' })
  await savedCard.waitFor()
  await savedCard.getByRole('button', { name: 'Quitar de guardados', exact: true }).click()
  await savedCard.waitFor({ state: 'detached' })
  if (size === 'mobile') await page.getByRole('button', { name: 'Abrir menú' }).click()
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /^Explorar reportes/ })
    .click()
  await search.fill('mochila')
  await expectTitles(page, ['Mochila azul encontrada'])

  // A failed filtered search must retain its controls and retry the same query.
  await page.getByRole('combobox', { name: 'Ciudad', exact: true }).selectOption('La Paz')
  await page.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption('Objeto')
  await page.getByRole('tab', { name: 'Perdidos', exact: true }).click()
  let failOnce = true
  await page.route('**/api/reports*', async (route) => {
    if (new URL(route.request().url()).searchParams.get('q') === 'camara' && failOnce) {
      failOnce = false
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
    } else await route.continue()
  })
  await search.fill('camara')
  await page.getByRole('alert').waitFor()
  assert.equal(
    await page
      .getByRole('heading', { name: 'No se encontraron coincidencias', exact: true })
      .count(),
    0,
  )
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expectTitles(page, ['Cámara de prueba perdida'])
  await page.unroute('**/api/reports*')
  assert.equal(await search.inputValue(), 'camara')
  assert.equal(
    await page.getByRole('combobox', { name: 'Ciudad', exact: true }).inputValue(),
    'La Paz',
  )
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished),
    ),
  )
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  )
  await page.screenshot({ path: `test-results/search-${size}.png`, fullPage: true })
}

try {
  api = startApi()
  await waitFor(`${apiUrl}/reports`, api)
  web = start(
    'pnpm',
    [
      '--filter',
      '@perdiu/web',
      'exec',
      'vite',
      '--host',
      '127.0.0.1',
      '--port',
      String(webPort),
      '--strictPort',
    ],
    new URL('../', import.meta.url),
    { API_PROXY_TARGET: apiUrl, VITE_API_BASE_URL: '/api' },
  )
  await waitFor(webUrl, web)
  browser = await launch()
  let page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  await page.route('**/api/reports*', async (route) => {
    await gate
    await route.continue()
  })
  await openCatalog(page)
  await page.getByRole('status').filter({ hasText: 'Cargando reportes' }).waitFor()
  assert.equal(await page.locator('.report-card').count(), 0)
  release()
  await expectCatalog(page)
  await page.unroute('**/api/reports*')
  await page.getByRole('textbox', { name: 'Buscar reportes' }).fill('mochila')
  await expectTitles(page, ['Mochila azul encontrada'])
  await page.getByRole('textbox', { name: 'Buscar reportes' }).fill('sin-coincidencias-de-prueba')
  await page
    .getByRole('heading', { name: 'No se encontraron coincidencias' })
    .waitFor({ timeout: 2000 })
  assert.equal(await page.locator('.report-card').count(), 0)
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click()
  await expectCatalog(page)
  await mkdir(new URL('../test-results/', import.meta.url), { recursive: true })
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished),
    ),
  )
  await page.screenshot({ path: 'test-results/catalog-desktop.png', fullPage: true })

  await page.getByRole('button', { name: 'Mochila azul encontrada', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor()
  assert.equal(
    await dialog.getByRole('button', { name: /WhatsApp|Marcar como resuelto/ }).count(),
    0,
  )
  assert.match(await dialog.textContent(), /Santiago Demo/)
  await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click()

  await stop(api)
  api = undefined
  await page.reload()
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /^Explorar reportes/ })
    .click()
  await page.getByRole('alert').waitFor()
  assert.equal(await page.locator('.report-card').count(), 0)
  api = startApi()
  await waitFor(`${apiUrl}/reports`, api)
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
  await expectCatalog(page)

  await browser.close()
  browser = await launch()
  page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto(webUrl)
  await page.getByRole('button', { name: 'Abrir menú' }).click()
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /^Explorar reportes/ })
    .click()
  await expectCatalog(page)
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    'La vista móvil no debe desbordar horizontalmente.',
  )
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished),
    ),
  )
  await page.screenshot({ path: 'test-results/catalog-mobile.png', fullPage: true })

  await pool.query(
    await readFile(
      new URL('../packages/database/test/fixtures/search.sql', import.meta.url),
      'utf8',
    ),
  )
  // Start a fresh page for each viewport so acceptance does not depend on previous controls.
  for (const [size, viewport] of [
    ['desktop', { width: 1440, height: 1000 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    await page.close()
    page = await browser.newPage({ viewport })
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.goto(webUrl)
    if (size === 'mobile') await page.getByRole('button', { name: 'Abrir menú' }).click()
    await page
      .getByRole('navigation')
      .getByRole('button', { name: /^Explorar reportes/ })
      .click()
    await page.locator('.report-card').first().waitFor()
    await verifySearch(page, size)
  }

  await pool.query(
    await readFile(
      new URL('../packages/database/test/fixtures/limit.sql', import.meta.url),
      'utf8',
    ),
  )
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'Se muestran hasta 50 resultados' }).waitFor()
  assert.equal(await page.locator('.report-card').count(), 50)
  await page.getByRole('textbox', { name: 'Buscar reportes' }).fill('sin-coincidencias-de-prueba')
  await page
    .getByRole('heading', { name: 'No se encontraron coincidencias', exact: true })
    .waitFor()
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'Se muestran hasta 50 resultados' }).waitFor()

  await pool.query('UPDATE reports SET state = $1', ['resolved'])
  await page.reload()
  await page.getByRole('button', { name: 'Abrir menú' }).click()
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /^Explorar reportes/ })
    .click()
  await page.getByRole('heading', { name: 'Todavía no hay reportes' }).waitFor()
  assert.equal(await page.locator('.report-card').count(), 0)
  assert.deepEqual(pageErrors, [])
  console.log(
    'Navegador: catálogo real, privacidad, búsqueda sin tildes, filtros combinados, limpieza, publicación desde vacío, cambios rápidos, error/reintento con filtros, límite de 50, reinicio y móvil/escritorio verificados.',
  )
} finally {
  await browser?.close()
  await stop(web)
  await stop(api)
  await pool.end()
}
