import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { createApplication } from '../src/app.js'
import {
  createRemoteAccessTokenVerifier,
  type AccessTokenVerifier,
} from '../src/auth/access-token.js'
import { createPool } from '@perdiu/database'
import { assertLocalDatabase } from '@perdiu/database/config'
import { migrate, seed } from '@perdiu/database/maintenance'
import { audience, issuer, jwksServer, signingKey } from './support/auth.js'

// Fictional seed data: an active report with photo and phone, one without either, and a resolved one.
const withPhoto = '20000000-0000-0000-0000-000000000001'
const withoutPhoto = '20000000-0000-0000-0000-000000000002'
const resolved = '20000000-0000-0000-0000-000000000003'
const resolvedOwner = '10000000-0000-0000-0000-000000000002'
const otherAccount = '10000000-0000-0000-0000-000000000001'
const privateData =
  /phone|email|ownerId|owner_id|storageKey|storage_key|59170000001|fictional@example\.invalid|fixture-private-storage-key/

/** Seeded catalog on the disposable PostgreSQL, a local JWKS and a running API. */
async function withCatalog(
  run: (url: string, sign: (sub: string) => Promise<string>) => Promise<void>,
) {
  assert.equal(process.env.PERDIU_TEST_CONTAINER, '1', 'Ejecuta pnpm test:integration.')
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl, 'Falta configuración de PostgreSQL de pruebas.')
  assertLocalDatabase(databaseUrl)
  const pool = createPool(databaseUrl)
  try {
    await migrate(pool)
    await pool.query('TRUNCATE TABLE profiles CASCADE')
    await seed(pool)
  } finally {
    await pool.end()
  }
  const key = await signingKey('detail')
  const jwks = await jwksServer([key.jwk])
  const verifier: AccessTokenVerifier = createRemoteAccessTokenVerifier(jwks.url, {
    issuer,
    audience,
  })
  const app = await createApplication(databaseUrl, verifier)
  try {
    await app.listen(0, '127.0.0.1')
    await run(await app.getUrl(), (sub) => key.sign({ sub }))
  } finally {
    await app.close()
    await jwks.close()
  }
}

const request = (url: string, path: string, token?: string) =>
  fetch(`${url}${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} })

test('el detalle HTTP de un reporte activo es público, sin caché y sin datos privados', async () => {
  await withCatalog(async (url) => {
    const response = await request(url, `/reports/${withPhoto}`)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    const text = await response.text()
    assert.ok(!privateData.test(text), 'el JSON no contiene contacto ni almacenamiento')
    // Parse in the test realm so deepEqual compares content, not prototypes.
    const report = JSON.parse(text)
    assert.deepEqual(Object.keys(report).sort(), [
      'author',
      'category',
      'city',
      'createdAt',
      'description',
      'id',
      'imageUrls',
      'incidentDate',
      'state',
      'title',
      'type',
      'zone',
    ])
    assert.deepEqual(report.author, { id: otherAccount, displayName: 'Santiago Demo' })
    assert.deepEqual(report.imageUrls, ['/images/object.svg'])
    assert.equal(report.title, 'Mochila azul encontrada')

    const upper = await request(url, `/reports/${withPhoto.toUpperCase()}`)
    assert.equal(JSON.parse(await upper.text()).id, withPhoto)
    const noPhoto = JSON.parse(await (await request(url, `/reports/${withoutPhoto}`)).text())
    assert.deepEqual(noPhoto.imageUrls, [], 'la web elige la imagen genérica de su categoría')
  })
})

test('el detalle HTTP distingue inexistente, resuelto ajeno, ID inválido y fallo de consulta', async () => {
  await withCatalog(async (url, sign) => {
    const unavailable = async (path: string, token?: string) => {
      const response = await request(url, path, token)
      assert.equal(response.status, 404, path)
      assert.equal(JSON.parse(await response.text()).message, 'Reporte no disponible.')
    }
    await unavailable(`/reports/${crypto.randomUUID()}`)
    await unavailable(`/reports/${resolved}`)
    await unavailable(`/reports/${resolved}`, await sign(otherAccount))

    const own = await request(url, `/reports/${resolved}`, await sign(resolvedOwner))
    assert.equal(own.status, 200, 'el propietario sigue viendo su caso cerrado')
    assert.equal(own.headers.get('cache-control'), 'no-store')
    assert.equal(JSON.parse(await own.text()).state, 'resolved')

    const invalid = await request(url, '/reports/reporte-1')
    assert.equal(invalid.status, 400)
    assert.equal(JSON.parse(await invalid.text()).message, 'Identificador de reporte inválido.')

    const forged = await request(url, `/reports/${withPhoto}`, 'not-a-token')
    assert.equal(forged.status, 401, 'una credencial presente debe ser válida')

    const pool = createPool(process.env.TEST_DATABASE_URL!)
    await pool.query('ALTER TABLE reports RENAME TO unavailable_reports')
    try {
      const failed = await request(url, `/reports/${withPhoto}`)
      assert.equal(failed.status, 503)
      assert.equal(
        JSON.parse(await failed.text()).message,
        'No se pudo cargar el reporte. Intenta nuevamente.',
      )
    } finally {
      await pool.query('ALTER TABLE unavailable_reports RENAME TO reports')
      await pool.end()
    }
  })
})

test('el contacto HTTP exige sesión y entrega solo el número de WhatsApp normalizado', async () => {
  await withCatalog(async (url, sign) => {
    const visitor = await request(url, `/reports/${withPhoto}/contact`)
    assert.equal(visitor.status, 401, 'ocultar el botón no basta: la API exige sesión')
    assert.equal(visitor.headers.get('www-authenticate'), 'Bearer')
    assert.ok(!/59170000001/.test(await visitor.text()))

    const token = await sign(resolvedOwner)
    const contact = await request(url, `/reports/${withPhoto}/contact`, token)
    assert.equal(contact.status, 200)
    assert.equal(contact.headers.get('cache-control'), 'no-store')
    assert.deepEqual(JSON.parse(await contact.text()), {
      available: true,
      whatsapp: '59170000001',
    })

    const pool = createPool(process.env.TEST_DATABASE_URL!)
    try {
      // As publishing (S1-05) stores it: international format with its country code.
      await pool.query('INSERT INTO report_contacts (report_id, phone) VALUES ($1, $2)', [
        withoutPhoto,
        '+5491112345678',
      ])
      const abroad = await request(url, `/reports/${withoutPhoto}/contact`, token)
      assert.deepEqual(JSON.parse(await abroad.text()), {
        available: true,
        whatsapp: '5491112345678',
      })
      await pool.query('DELETE FROM report_contacts WHERE report_id = $1', [withoutPhoto])
    } finally {
      await pool.end()
    }

    const missing = await request(url, `/reports/${withoutPhoto}/contact`, token)
    assert.equal(missing.status, 200)
    assert.deepEqual(JSON.parse(await missing.text()), { available: false })
  })
})

test('el contacto HTTP no se entrega para un resuelto ajeno y distingue ID inválido y fallo', async () => {
  await withCatalog(async (url, sign) => {
    const other = await request(url, `/reports/${resolved}/contact`, await sign(otherAccount))
    assert.equal(other.status, 404, 'un tercero no obtiene el contacto de un caso cerrado')
    assert.equal(JSON.parse(await other.text()).message, 'Reporte no disponible.')
    const unknown = await request(
      url,
      `/reports/${crypto.randomUUID()}/contact`,
      await sign(otherAccount),
    )
    assert.equal(unknown.status, 404)

    const own = await request(url, `/reports/${resolved}/contact`, await sign(resolvedOwner))
    assert.equal(own.status, 200, 'el propietario conserva el acceso a su caso')
    assert.deepEqual(JSON.parse(await own.text()), { available: false })

    const invalid = await request(url, '/reports/reporte-1/contact', await sign(otherAccount))
    assert.equal(invalid.status, 400)

    const pool = createPool(process.env.TEST_DATABASE_URL!)
    await pool.query('ALTER TABLE report_contacts RENAME TO unavailable_contacts')
    try {
      const failed = await request(url, `/reports/${withPhoto}/contact`, await sign(otherAccount))
      assert.equal(failed.status, 503)
      assert.equal(
        JSON.parse(await failed.text()).message,
        'No se pudo cargar el contacto. Intenta nuevamente.',
      )
    } finally {
      await pool.query('ALTER TABLE unavailable_contacts RENAME TO report_contacts')
      await pool.end()
    }
  })
})
