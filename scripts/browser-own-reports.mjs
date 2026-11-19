import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { spawn } from 'cross-spawn'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

/** Real Auth/API/PG supplied by verify-auth; only the intentional error responses are doubled. */
export async function verifyOwnReportsBrowser({
  apiUrl,
  authUrl,
  webPort,
  pool,
  accounts,
  restartApi,
}) {
  const webUrl = `http://127.0.0.1:${webPort}`
  const web = spawn(
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
    {
      cwd: new URL('../', import.meta.url),
      env: {
        ...process.env,
        API_PROXY_TARGET: apiUrl,
        AUTH_PROXY_TARGET: authUrl,
        VITE_API_BASE_URL: '/api',
        VITE_AUTH_URL: '/auth',
      },
      detached: true,
      stdio: 'ignore',
    },
  )
  let startError = false
  web.on('error', () => {
    startError = true
  })
  let browser
  const errors = []
  const ids = Array.from({ length: 4 }, () => crypto.randomUUID())
  const titles = [
    'Mochila de aceptación',
    'Llaves de aceptación',
    'Documento ya resuelto',
    'Reporte de otra cuenta',
  ]
  const navigate = async (page, label) => {
    const menu = page.getByRole('button', { name: 'Abrir menú', exact: true })
    if (await menu.isVisible()) await menu.click()
    await page.getByRole('navigation').getByRole('button', { name: label }).click()
  }
  const ownPage = async (page) => {
    await navigate(page, 'Mi perfil')
    await page.locator('main').getByRole('button', { name: 'Mis reportes' }).click()
    await page.getByRole('heading', { name: 'Mis reportes', exact: true }).waitFor()
  }
  const typeSucre = async (city) => {
    await city.fill('', { timeout: 5000 })
    await city.pressSequentially('Sucre')
    assert.equal(await city.inputValue(), 'Sucre')
    assert.deepEqual(
      await city.evaluate((input) => Array.from(input.list.options, ({ value }) => value)),
      ['La Paz', 'Cochabamba', 'Santa Cruz'],
    )
  }
  const login = async (page, account) => {
    const failures = []
    const recordFailure = (response) => {
      if (response.status() >= 400)
        failures.push({ path: new URL(response.url()).pathname, status: response.status() })
    }
    page.on('response', recordFailure)
    await navigate(page, /^Mis reportes/)
    await page.getByRole('heading', { name: 'Iniciar sesión', exact: true }).waitFor()
    await page.getByLabel('Correo electrónico', { exact: true }).fill(account.email)
    await page.getByLabel('Contraseña', { exact: true }).fill(account.password)
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
    try {
      await page.getByRole('heading', { name: 'Mis reportes', exact: true }).waitFor()
    } catch (error) {
      await page.screenshot({ path: 'test-results/own-login-failed.png', fullPage: true })
      console.error('Estados HTTP durante el ingreso:', JSON.stringify(failures))
      throw error
    } finally {
      page.off('response', recordFailure)
    }
  }
  const contactPublishedReport = async (browser, viewport) => {
    const context = await browser.newContext({ viewport })
    try {
      const page = await context.newPage()
      page.on('pageerror', (error) => errors.push(error.message))
      await context.route('https://wa.me/**', (route) =>
        route.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp</title>' }),
      )
      await page.goto(`${webUrl}/reportes/${ids[0]}`)
      const detail = page.getByRole('dialog')
      await detail.getByRole('heading', { name: titles[0], exact: true }).waitFor()
      const location = detail.getByRole('region', { name: 'Ubicación reportada' })
      await location.getByText('Sucre', { exact: true }).waitFor()
      await location.getByText('Centro', { exact: true }).waitFor()
      const contact = detail.getByRole('button', { name: 'Contactar por WhatsApp' })
      await contact.click()
      await page.getByRole('heading', { name: 'Iniciar sesión', exact: true }).waitFor()
      await page.getByLabel('Correo electrónico', { exact: true }).fill(accounts[1].email)
      await page.getByLabel('Contraseña', { exact: true }).fill(accounts[1].password)
      await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
      await detail.getByRole('heading', { name: titles[0], exact: true }).waitFor()
      assert.equal(await detail.getByRole('button', { name: 'Marcar como resuelto' }).count(), 0)
      assert.equal(await detail.getByRole('button', { name: 'Editar datos' }).count(), 0)
      const [chat] = await Promise.all([context.waitForEvent('page'), contact.click()])
      await chat.waitForLoadState()
      const destination = new URL(chat.url())
      assert.equal(destination.hostname, 'wa.me')
      assert.equal(destination.pathname, '/59170000000')
      assert.ok(destination.searchParams.get('text').includes(titles[0]))
      assert.ok(destination.searchParams.get('text').includes(`${webUrl}/reportes/${ids[0]}`))
      await chat.close()
      console.log(
        '✓ publicación persistente consultada y contactada por otra cuenta con Auth real, sin enviar mensajes',
      )
    } finally {
      await context.close()
    }
  }
  const row = (page, title) => page.locator('.managed-report').filter({ hasText: title })
  const expectResolved = async (page, title) => {
    await row(page, title)
      .getByText(/Resuelto/)
      .waitFor()
    assert.equal(
      await row(page, title).getByRole('button', { name: 'Marcar como resuelto' }).count(),
      0,
    )
  }
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (startError || web.exitCode !== null)
        throw new Error('Vite no pudo iniciar para la aceptación privada.')
      try {
        if ((await fetch(webUrl)).ok) break
      } catch {
        /* Wait for Vite. */
      }
      if (attempt === 99) throw new Error('Vite no inició en 20 segundos.')
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
    await pool.query(
      "INSERT INTO profiles (id, display_name) VALUES ($1, 'Mismo Nombre'), ($2, 'Mismo Nombre')",
      accounts.map((account) => account.id),
    )
    // Existing history and another owner's report; the active found case is published in the UI.
    for (let i = 1; i < ids.length; i++)
      await pool.query(
        `INSERT INTO reports (id, owner_id, type, state, category, title, description, city, zone, incident_date)
       VALUES ($1, $2, $3, $4, 'object', $5, 'Descripción ficticia para la aceptación de reportes propios.', 'La Paz', 'Centro', '2026-10-20')`,
        [
          ids[i],
          accounts[i === 3 ? 1 : 0].id,
          i === 1 ? 'lost' : 'found',
          i === 2 ? 'resolved' : 'active',
          titles[i],
        ],
      )
    const privatePhotoIds = Array.from({ length: 3 }, () => crypto.randomUUID())
    for (const [position, id] of privatePhotoIds.entries())
      await pool.query(
        `INSERT INTO report_media (id, owner_id, storage_key, content_type, size_bytes, report_id, position)
         VALUES ($1, $2, $3, 'image/png', 68, $4, $5)`,
        [id, accounts[0].id, `acceptance-private-photo-${position}`, ids[2], position],
      )
    const executablePath =
      process.env.CHROMIUM_PATH ||
      (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
    browser = await chromium.launch({ headless: true, ...(executablePath && { executablePath }) })
    await mkdir(new URL('../test-results/', import.meta.url), { recursive: true })
    for (const [size, viewport] of [
      ['desktop', { width: 1440, height: 1000 }],
      ['mobile', { width: 390, height: 844 }],
    ]) {
      const context = await browser.newContext({ viewport })
      // Demo images are unrelated to this Auth/API flow and can delay navigation.
      await context.route('https://images.unsplash.com/**', (route) => route.abort())
      const page = await context.newPage()
      page.on('pageerror', (error) => errors.push(error.message))
      // The provider image is doubled; Auth, the DTO and its ownership remain real.
      let authenticatedPhotoReads = 0
      for (const privatePhotoId of privatePhotoIds)
        await page.route(`**/api/media/${privatePhotoId}`, async (route) => {
          assert.match(route.request().headers().authorization ?? '', /^Bearer \S+$/)
          authenticatedPhotoReads++
          await route.fulfill({
            status: 200,
            contentType: 'image/png',
            body: Buffer.from(
              'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
              'base64',
            ),
          })
        })
      await page.goto(webUrl, { waitUntil: 'domcontentloaded' })
      let listFails = size === 'desktop'
      await page.route('**/api/me/reports', async (route) => {
        if (listFails) {
          listFails = false
          return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
        }
        await route.continue()
      })
      await login(page, accounts[0])
      if (size === 'desktop') {
        await page
          .getByRole('alert')
          .filter({ hasText: 'No se pudo cargar tus reportes' })
          .waitFor()
        await page.getByRole('button', { name: 'Reintentar', exact: true }).click()
        await row(page, titles[1]).waitFor()
        await navigate(page, 'Publicar reporte')
        await page.getByRole('button', { name: 'Encontré algo', exact: true }).click()
        await page.getByRole('combobox', { name: /^Categoría/ }).selectOption('object')
        await page.getByLabel('Nombre del reporte', { exact: true }).fill(titles[0])
        await page
          .getByRole('textbox', { name: /^Descripción/ })
          .fill('Mochila ficticia encontrada cerca de la plaza de aceptación.')
        await page.getByLabel('Zona o barrio', { exact: true }).fill('Centro')
        await page.getByLabel('Fecha aproximada', { exact: true }).fill('2026-10-20')
        await page.getByRole('textbox', { name: /^Número de WhatsApp/ }).fill('+591 70000000')
        const city = page.getByRole('combobox', { name: /^Ciudad/ })
        const submit = page
          .locator('form')
          .getByRole('button', { name: 'Publicar reporte', exact: true })
        await city.fill('', { timeout: 5000 })
        await submit.click()
        await page.getByText('Indica una ciudad.', { exact: true }).waitFor()
        await city.fill('🏙'.repeat(50) + 'x')
        await submit.click()
        await page.getByText('Usa como máximo 100 caracteres.', { exact: true }).waitFor()
        assert.equal(await city.getAttribute('aria-invalid'), 'true')
        await typeSucre(city)
        const published = page.waitForResponse(
          (response) =>
            response.request().method() === 'POST' &&
            new URL(response.url()).pathname === '/api/reports',
        )
        await submit.click()
        const response = await published
        assert.equal(response.status(), 201)
        const report = await response.json()
        assert.equal(report.city, 'Sucre')
        ids[0] = report.id
        const storedCity = (await pool.query('SELECT city FROM reports WHERE id = $1', [report.id]))
          .rows[0]
        assert.equal(storedCity.city, 'Sucre')
        await page.getByRole('heading', { name: 'Explorar reportes', exact: true }).waitFor()
        await navigate(page, 'Resumen')
        await page
          .locator('.report-card')
          .getByRole('button', { name: titles[0], exact: true })
          .waitFor()
        await contactPublishedReport(browser, viewport)
        await ownPage(page)
        const edit = row(page, titles[0]).getByRole('button', { name: 'Editar datos' })
        await edit.click()
        const editor = page.getByRole('dialog', { name: 'Editar reporte', exact: true })
        assert.equal(
          await editor.getByLabel('Nombre del reporte', { exact: true }).inputValue(),
          titles[0],
        )
        const save = editor.getByRole('button', { name: 'Guardar cambios', exact: true })
        assert.equal(await save.isDisabled(), true)
        await page.screenshot({ path: 'test-results/edit-report-desktop.png' })
        await page.keyboard.press('Escape')
        await editor.waitFor({ state: 'detached' })
        assert.equal(await edit.evaluate((button) => button.matches(':focus')), true)

        await edit.click()
        const description = editor.getByLabel('Descripción', { exact: true })
        const originalDescription = await description.inputValue()
        await description.fill('Breve')
        await save.click()
        await editor.getByText('Usa al menos 20 caracteres', { exact: false }).waitFor()
        assert.equal(await description.getAttribute('aria-invalid'), 'true')
        await editor.locator('textarea:focus').waitFor()
        await description.fill(originalDescription)
        await editor.getByLabel('Ciudad', { exact: true }).fill('Cochabamba')
        await editor.getByLabel('Categoría').selectOption('pet')
        await editor.getByLabel('Especie de la mascota', { exact: true }).fill('Perro')

        const editPath = `**/api/reports/${ids[0]}`
        const releaseSave = Promise.withResolvers()
        await page.route(editPath, async (route) => {
          if (route.request().method() === 'PATCH') await releaseSave.promise
          await route.continue()
        })
        const saved = page.waitForResponse(
          (response) =>
            response.request().method() === 'PATCH' &&
            new URL(response.url()).pathname === `/api/reports/${ids[0]}`,
        )
        try {
          await save.click()
          await editor.getByRole('button', { name: 'Guardando…', exact: true }).waitFor()
          assert.equal(await editor.getByRole('button', { name: 'Cancelar' }).isDisabled(), true)
          assert.equal(await description.isDisabled(), true)
          await page.keyboard.press('Escape')
          assert.equal(await editor.isVisible(), true)
        } finally {
          releaseSave.resolve()
        }
        const editResponse = await saved
        await page.unroute(editPath)
        assert.equal(editResponse.status(), 200)
        const updated = await editResponse.json()
        assert.equal(updated.city, 'Cochabamba')
        assert.equal(updated.category, 'pet')
        assert.equal(updated.petSpecies, 'Perro')
        const stored = (
          await pool.query('SELECT city, category, pet_species FROM reports WHERE id = $1', [
            ids[0],
          ])
        ).rows[0]
        assert.deepEqual(stored, { city: 'Cochabamba', category: 'pet', pet_species: 'Perro' })
        await row(page, titles[0]).getByRole('button', { name: titles[0], exact: true }).click()
        const ownDetail = page.getByRole('dialog', { name: titles[0], exact: true })
        await ownDetail.getByRole('heading', { name: titles[0], exact: true }).waitFor()
        const detailEdit = ownDetail.getByRole('button', { name: 'Editar datos', exact: true })
        await detailEdit.click()
        const detailEditor = page.getByRole('dialog', { name: 'Editar reporte', exact: true })
        assert.equal(
          await detailEditor.getByLabel('Nombre del reporte', { exact: true }).inputValue(),
          titles[0],
        )
        await detailEditor.getByRole('button', { name: 'Cancelar', exact: true }).click()
        await detailEditor.waitFor({ state: 'detached' })
        assert.equal(await detailEdit.evaluate((button) => button.matches(':focus')), true)
        await ownDetail.getByRole('button', { name: 'Cerrar', exact: true }).click()
        await navigate(page, 'Resumen')
        await page
          .locator('.report-card')
          .filter({ hasText: titles[0] })
          .getByText(/Centro, Cochabamba/)
          .waitFor()
        await ownPage(page)
      } else {
        await navigate(page, 'Publicar reporte')
        await typeSucre(page.getByRole('combobox', { name: /^Ciudad/ }))
        await ownPage(page)
        await row(page, titles[1]).getByRole('button', { name: 'Editar datos' }).click()
        const editor = page.getByRole('dialog', { name: 'Editar reporte', exact: true })
        const save = editor.getByRole('button', { name: 'Guardar cambios', exact: true })
        const actionsBeforeScroll = await save.boundingBox()
        assert.ok(
          actionsBeforeScroll &&
            actionsBeforeScroll.y + actionsBeforeScroll.height <= viewport.height,
        )
        await page.screenshot({ path: 'test-results/edit-report-mobile.png' })
        await editor.getByLabel('Fecha del hecho', { exact: true }).scrollIntoViewIfNeeded()
        assert.deepEqual(await save.boundingBox(), actionsBeforeScroll)
        await editor.getByRole('button', { name: 'Cerrar edición', exact: true }).click()
        await editor.waitFor({ state: 'detached' })
      }
      await row(page, titles[0]).waitFor()
      const privateImage = row(page, titles[2]).locator('img')
      await privateImage.evaluate(
        (image) =>
          new Promise((resolve, reject) => {
            if (image.complete && image.naturalWidth > 0) return resolve()
            image.onload = () => resolve()
            image.onerror = () => reject(new Error('No se pudo mostrar la foto privada.'))
          }),
      )
      assert.ok(authenticatedPhotoReads > 0)
      await row(page, titles[2]).getByRole('button', { name: titles[2], exact: true }).click()
      for (const reload of [false, true]) {
        if (reload) await page.reload()
        const detail = page.getByRole('dialog')
        await detail.getByRole('heading', { name: titles[2], exact: true }).waitFor()
        for (const image of await detail.locator('.detail-image').all())
          await image.evaluate(
            (element) =>
              new Promise((resolve, reject) => {
                if (element.complete && element.naturalWidth > 0) return resolve()
                element.onload = () => resolve()
                element.onerror = () => reject(new Error('La foto del detalle no está disponible.'))
              }),
          )
      }
      await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click()
      await ownPage(page)
      await row(page, titles[0]).waitFor()
      assert.equal(
        await page.locator('.managed-report').count(),
        3,
        'Todos los reportes propios siguen visibles',
      )
      assert.equal(await page.getByText(titles[3], { exact: true }).count(), 0)
      assert.equal(await page.getByRole('button', { name: /Eliminar/ }).count(), 0)
      await page.getByRole('tab', { name: 'Activos', exact: true }).click()
      assert.equal(await page.locator('.managed-report').count(), size === 'desktop' ? 2 : 1)
      await page.getByRole('tab', { name: 'Resueltos', exact: true }).click()
      assert.equal(await page.locator('.managed-report').count(), size === 'desktop' ? 1 : 2)
      await page.getByRole('tab', { name: 'Todos', exact: true }).click()
      await page.screenshot({ path: `test-results/own-reports-${size}.png`, fullPage: true })
      const target = size === 'desktop' ? titles[0] : titles[1]
      if (size === 'desktop') {
        await navigate(page, /^Explorar reportes/)
        await page.getByRole('textbox', { name: 'Buscar reportes' }).fill(target)
        await page
          .locator('.report-card')
          .getByRole('button', { name: target, exact: true })
          .click()
        const detail = page.getByRole('dialog')
        await detail.getByRole('button', { name: 'Copiar enlace', exact: true }).waitFor()
        await detail.getByRole('button', { name: 'Guardar', exact: true }).click()
        await detail.getByRole('button', { name: 'Marcar como resuelto', exact: true }).click()
      } else await row(page, target).getByRole('button', { name: 'Marcar como resuelto' }).click()
      let patchCalls = 0
      let failOnce = size === 'desktop'
      let release
      const gate = new Promise((resolve) => {
        release = resolve
      })
      await page.route('**/api/reports/*/resolve', async (route) => {
        patchCalls++
        if (failOnce) {
          failOnce = false
          return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
        }
        if (size === 'desktop') await gate
        await route.continue()
      })
      const confirmation = page.getByRole('alertdialog')
      await confirmation.waitFor()
      assert.ok(
        await confirmation
          .getByRole('button', { name: 'Cancelar', exact: true })
          .evaluate((button) => button === document.activeElement),
        'La confirmación sitúa el foco en Cancelar',
      )
      await page.screenshot({ path: `test-results/own-confirm-${size}.png`, fullPage: true })
      if (size === 'mobile') await page.keyboard.press('Escape')
      else await confirmation.getByRole('button', { name: 'Cancelar', exact: true }).click()
      assert.equal(patchCalls, 0)
      if (size === 'desktop')
        await page.getByRole('dialog').getByRole('button', { name: 'Marcar como resuelto' }).click()
      else await row(page, target).getByRole('button', { name: 'Marcar como resuelto' }).click()
      await confirmation.getByRole('button', { name: 'Confirmar cierre' }).click()
      if (size === 'desktop') {
        await confirmation.getByRole('alert').waitFor()
        assert.equal(
          (await pool.query('SELECT state FROM reports WHERE id = $1', [ids[0]])).rows[0].state,
          'active',
        )
        await confirmation.getByRole('button', { name: 'Confirmar cierre' }).click()
        await confirmation.getByRole('button', { name: 'Cerrando caso…' }).waitFor()
        assert.equal(
          await confirmation.getByRole('button', { name: 'Cerrando caso…' }).isDisabled(),
          true,
        )
        assert.equal(
          await confirmation.getByRole('button', { name: 'Cancelar' }).isDisabled(),
          true,
        )
        release()
      }
      await confirmation.waitFor({ state: 'detached' })
      assert.equal(patchCalls, size === 'desktop' ? 2 : 1)
      if (size === 'desktop') {
        const detail = page.getByRole('dialog')
        await detail.getByText('Resuelto', { exact: true }).waitFor()
        assert.equal(await detail.getByRole('button', { name: 'Marcar como resuelto' }).count(), 0)
        assert.equal(await detail.getByRole('button', { name: 'Copiar enlace' }).count(), 0)
        await detail.getByRole('button', { name: 'Cerrar', exact: true }).click()
        await page.getByRole('heading', { name: 'No se encontraron coincidencias' }).waitFor()
        await navigate(page, 'Resumen')
        await page.getByRole('heading', { name: 'Reportes recientes', exact: true }).waitFor()
        assert.equal(
          await page
            .locator('.report-card')
            .getByRole('button', { name: target, exact: true })
            .count(),
          0,
        )
        await restartApi()
      }
      await page.reload()
      await ownPage(page)
      await expectResolved(page, target)
      if (size === 'desktop') assert.match(await row(page, target).textContent(), /Encontrado/)
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        'Sin desborde horizontal',
      )
      await page.screenshot({ path: `test-results/own-resolved-${size}.png`, fullPage: true })
      if (size === 'desktop') {
        await page.locator('.header-account').click()
        await page.getByRole('menuitem', { name: 'Cerrar sesión', exact: true }).click()
        await page.getByRole('heading', { name: 'Explorar reportes', exact: true }).waitFor()
        await login(page, accounts[1])
        await row(page, titles[3]).waitFor()
        assert.equal(await page.locator('.managed-report').count(), 1)
        assert.equal(await page.getByText(titles[0], { exact: true }).count(), 0)
        await pool.query('DELETE FROM reports WHERE id = $1', [ids[3]])
        await page.reload()
        await ownPage(page)
        await page.getByRole('heading', { name: 'Aún no publicaste reportes' }).waitFor()
      }
      await context.close()
    }
    const persisted = (
      await pool.query('SELECT type, state FROM reports WHERE id = ANY($1::uuid[])', [
        ids.slice(0, 3),
      ])
    ).rows
    assert.equal(persisted.length, 3, 'La base de datos conserva los tres reportes de prueba')
    assert.ok(persisted.every((report) => report.state === 'resolved'))
    assert.deepEqual(errors, [])
    console.log(
      '✓ navegador privado: Auth real, nombres iguales, filtros, confirmación/cancelación, fallo/reintento, detalle, catálogo y resumen tras publicar, editar y cerrar, recarga desde perfil, reinicio, cambio de cuenta, vacío y móvil/escritorio',
    )
  } finally {
    await browser?.close()
    if (!startError && web.pid && web.exitCode === null) {
      const exited = new Promise((resolve) => web.once('exit', resolve))
      if (process.platform === 'win32')
        execFileSync('taskkill', ['/pid', String(web.pid), '/T', '/F'], { stdio: 'ignore' })
      else process.kill(-web.pid, 'SIGTERM')
      await exited
    }
  }
}
