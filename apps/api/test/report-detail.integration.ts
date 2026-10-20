import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import type { AuthenticatedUser, AccessTokenVerifier } from '../src/auth/access-token.js'
import { InvalidAccessToken } from '../src/auth/access-token.js'
import { createApplication } from '../src/app.js'
import { assertLocalDatabase } from '@perdiu/database/config'
import { createPool } from '@perdiu/database'
import { migrate } from '@perdiu/database/maintenance'

const owner = '66068112-224a-4d11-a6cd-c18bdd1ffb1b'
const other = '16068112-224a-4d11-a6cd-c18bdd1ffb1b'
const activeId = '26000000-0000-0000-0000-000000000001'
const resolvedId = '26000000-0000-0000-0000-000000000002'
const hiddenId = '26000000-0000-0000-0000-000000000003'
const ownerSession = '36068112-224a-4d11-a6cd-c18bdd1ffb1b'
const otherSession = '46068112-224a-4d11-a6cd-c18bdd1ffb1b'

const users = new Map<string, AuthenticatedUser>([
  ['owner-token', { id: owner, email: 'owner@example.test', sessionId: ownerSession }],
  ['other-token', { id: other, email: 'other@example.test', sessionId: otherSession }],
])
const verifier: AccessTokenVerifier = {
  async verify(token) {
    const user = users.get(token)
    if (!user) throw new InvalidAccessToken()
    return user
  },
}

test('GET detalle y contacto aplican disponibilidad, ownership y proyección privada en PostgreSQL', async () => {
  assert.equal(process.env.PERDIU_TEST_CONTAINER, '1', 'Ejecuta pnpm test:integration.')
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl, 'Falta configuración de PostgreSQL de pruebas.')
  assertLocalDatabase(databaseUrl)

  const pool = createPool(databaseUrl)
  let app: Awaited<ReturnType<typeof createApplication>> | undefined
  try {
    await migrate(pool)
    await pool.query('TRUNCATE TABLE profiles CASCADE')
    await pool.query(
      `INSERT INTO profiles (id, display_name) VALUES ($1, 'Dueña privada'), ($2, 'Tercero')`,
      [owner, other],
    )
    await pool.query(
      `INSERT INTO profile_contacts (profile_id, email) VALUES ($1, 'private-email-sentinel@example.test')`,
      [owner],
    )
    await pool.query(
      `INSERT INTO reports (id, owner_id, type, state, category, title, description, city, zone, incident_date) VALUES
        ($1, $2, 'found', 'active', 'object', 'Cámara "Cálida"', 'Hallazgo de prueba.', 'La Paz', 'Centro', '2026-10-10'),
        ($3, $2, 'lost', 'resolved', 'pet', 'Gatito devuelto', 'Caso cerrado de prueba.', 'Cochabamba', 'Norte', '2026-10-09'),
        ($4, $5, 'found', 'resolved', 'document', 'Documento cerrado', 'Caso privado de otra persona.', 'La Paz', 'Sur', '2026-10-08')`,
      [activeId, owner, resolvedId, hiddenId, other],
    )
    await pool.query(
      `INSERT INTO report_contacts (report_id, phone) VALUES
        ($1, '+591 70123456'),
        ($2, 'no-es-un-numero')`,
      [activeId, resolvedId],
    )
    await pool.query(
      `INSERT INTO report_images (report_id, position, public_url, storage_key)
       VALUES ($1, 0, '/images/object.svg', 'private-storage-sentinel')`,
      [activeId],
    )

    app = await createApplication(databaseUrl, verifier)
    await app.listen(0, '127.0.0.1')
    const base = await app.getUrl()
    const request = (path: string, token?: string) =>
      fetch(`${base}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

    const publicResponse = await request(`/reports/${activeId}`)
    assert.equal(publicResponse.status, 200)
    assert.equal(publicResponse.headers.get('cache-control'), 'no-store')
    const publicDetail = await publicResponse.json()
    assert.deepEqual(Object.keys(publicDetail).sort(), [
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
    assert.deepEqual(publicDetail.imageUrls, ['/images/object.svg'])
    assert.ok(
      !JSON.stringify(publicDetail).includes('private-email-sentinel') &&
        !JSON.stringify(publicDetail).includes('private-storage-sentinel') &&
        !JSON.stringify(publicDetail).includes('70123456'),
    )

    for (const [path, token] of [
      [`/reports/${resolvedId}`, undefined],
      [`/reports/${resolvedId}`, 'other-token'],
      [`/reports/${hiddenId}`, 'owner-token'],
      ['/reports/26000000-invalid', 'owner-token'],
      ['/reports/26000000-0000-0000-0000-000000000099', undefined],
    ] as const) {
      const response = await request(path, token)
      assert.ok([400, 404].includes(response.status))
      if (response.status === 404)
        assert.equal((await response.json()).message, 'Reporte no disponible.')
    }

    const ownerDetail = await request(`/reports/${resolvedId}`, 'owner-token')
    assert.equal(ownerDetail.status, 200)
    assert.equal((await ownerDetail.json()).state, 'resolved')

    assert.equal((await request(`/reports/${activeId}/contact`)).status, 401)
    const activeContact = await request(`/reports/${activeId}/contact`, 'other-token')
    assert.equal(
      activeContact.status,
      200,
      'un tercero autenticado puede contactar un reporte activo',
    )
    assert.deepEqual(await activeContact.json(), { phone: '59170123456' })

    const unavailableContact = await request(`/reports/${resolvedId}/contact`, 'owner-token')
    assert.equal(unavailableContact.status, 404)
    assert.equal((await unavailableContact.json()).message, 'El contacto no está disponible.')
    assert.equal((await request(`/reports/${resolvedId}/contact`, 'other-token')).status, 404)

    await pool.query('ALTER TABLE reports RENAME TO unavailable_reports')
    try {
      const failed = await request(`/reports/${activeId}`)
      assert.equal(failed.status, 503)
      assert.equal(
        (await failed.json()).message,
        'No se pudo cargar el reporte. Intenta nuevamente.',
      )
    } finally {
      await pool.query('ALTER TABLE unavailable_reports RENAME TO reports')
    }
  } finally {
    await app?.close()
    await pool.end()
  }
})
