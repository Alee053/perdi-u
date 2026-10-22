import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from '@jest/globals'
import { SignJWT, exportJWK, generateKeyPair } from 'jose'
import { createPool } from '@perdiu/database'
import { assertLocalDatabase } from '@perdiu/database/config'
import { migrate } from '@perdiu/database/maintenance'
import { createApplication } from '../src/app.js'
import { createRemoteAccessTokenVerifier } from '../src/auth/access-token.js'

async function fixture(
  run: (context: {
    url: string
    pool: ReturnType<typeof createPool>
    owners: string[]
    ids: string[]
    request(path: string, owner?: string, method?: string, body?: unknown): Promise<Response>
    restart(): Promise<void>
  }) => Promise<void>,
) {
  assert.equal(process.env.PERDIU_TEST_CONTAINER, '1', 'Ejecuta pnpm test:integration.')
  const databaseUrl = process.env.TEST_DATABASE_URL!
  assertLocalDatabase(databaseUrl)
  const pool = createPool(databaseUrl)
  const owners = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]
  const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]
  const { privateKey, publicKey } = await generateKeyPair('ES256')
  const jwk = { ...(await exportJWK(publicKey)), kid: 'own-reports', alg: 'ES256', use: 'sig' }
  const jwks = createServer((_request, response) => {
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ keys: [jwk] }))
  })
  await new Promise<void>((resolve) => jwks.listen(0, '127.0.0.1', resolve))
  const issuer = 'http://localhost/auth'
  const verifier = createRemoteAccessTokenVerifier(
    `http://127.0.0.1:${(jwks.address() as { port: number }).port}/jwks`,
    { issuer, audience: 'authenticated' },
  )
  let app: Awaited<ReturnType<typeof createApplication>> | undefined
  const context = {
    url: '',
    pool,
    owners,
    ids,
    async request(path: string, owner?: string, method = 'GET', body?: unknown) {
      const token =
        owner &&
        (await new SignJWT({
          role: 'authenticated',
          email: 'ficticia@example.test',
          session_id: crypto.randomUUID(),
        })
          .setProtectedHeader({ alg: 'ES256', kid: 'own-reports' })
          .setIssuer(issuer)
          .setAudience('authenticated')
          .setSubject(owner)
          .setIssuedAt()
          .setExpirationTime('5m')
          .sign(privateKey))
      return fetch(`${context.url}${path}`, {
        method,
        headers: {
          ...(token && { authorization: `Bearer ${token}` }),
          ...(body !== undefined && { 'content-type': 'application/json' }),
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
      })
    },
    async restart() {
      await app?.close()
      app = await createApplication(databaseUrl, verifier)
      await app.listen(0, '127.0.0.1')
      context.url = await app.getUrl()
    },
  }
  try {
    await migrate(pool)
    await pool.query(
      "INSERT INTO profiles (id, display_name) SELECT unnest($1::uuid[]), 'Mismo Nombre'",
      [owners],
    )
    for (let i = 0; i < ids.length; i++)
      await pool.query(
        `INSERT INTO reports (id, owner_id, type, state, category, title, description, city, zone, incident_date)
       VALUES ($1, $2, 'found', $3, 'object', 'Mochila de prueba', 'Descripción ficticia para gestión de reportes.', 'La Paz', 'Centro', '2026-10-20')`,
        [ids[i], owners[i === 2 ? 1 : 0], i === 1 ? 'resolved' : 'active'],
      )
    await pool.query(
      "INSERT INTO report_contacts (report_id, phone) VALUES ($1, 'private-contact')",
      [ids[0]],
    )
    await context.restart()
    await run(context)
  } finally {
    await app?.close()
    await new Promise<void>((resolve) => jwks.close(() => resolve()))
    await pool.query('DELETE FROM report_contacts WHERE report_id = ANY($1::uuid[])', [ids])
    await pool.query('DELETE FROM reports WHERE id = ANY($1::uuid[])', [ids])
    await pool.query('DELETE FROM profiles WHERE id = ANY($1::uuid[])', [owners])
    await pool.end()
  }
}

test('mis reportes HTTP usa identidad verificada, incluye resueltos y filtra sin mezclar nombres iguales', async () => {
  await fixture(async ({ request, owners, ids }) => {
    assert.equal((await request('/me/reports')).status, 401)
    const own = await request('/me/reports', owners[0])
    assert.equal(own.status, 200)
    assert.equal(own.headers.get('cache-control'), 'no-store')
    const reports = JSON.parse(await own.text())
    assert.deepEqual(reports.map((r: { id: string }) => r.id).sort(), ids.slice(0, 2).sort())
    assert.ok(!JSON.stringify(reports).includes('private-contact'))
    for (const state of ['active', 'resolved']) {
      const response = await request(`/me/reports?state=${state}`, owners[0])
      assert.equal(response.status, 200)
      const filtered = await response.json()
      assert.equal(filtered.length, 1)
      assert.equal(filtered[0].state, state)
      assert.equal(filtered[0].type, 'found')
    }
    for (const query of [
      'ownerId=' + owners[1],
      'state=all',
      'state=active&state=resolved',
      'state[x]=active',
    ])
      assert.equal((await request('/me/reports?' + query, owners[0])).status, 400)
    const empty = await request('/me/reports', owners[2])
    assert.deepEqual(JSON.parse(await empty.text()), [])
    const other = await request('/me/reports', owners[1])
    assert.deepEqual(
      JSON.parse(await other.text()).map((r: { id: string }) => r.id),
      [ids[2]],
    )
  })
})

test('resolver HTTP verifica permisos, persiste tras reinicio y repetir no vuelve a escribir el cierre', async () => {
  await fixture(async ({ request, pool, owners, ids, restart }) => {
    const path = `/reports/${ids[0]}/resolve`
    const snapshot = async () =>
      (await pool.query('SELECT *, xmin::text AS version FROM reports WHERE id = $1', [ids[0]]))
        .rows[0]
    const before = await snapshot()
    assert.equal((await request(path, undefined, 'PATCH')).status, 401)
    assert.equal((await request(path, owners[1], 'PATCH', { ownerId: owners[0] })).status, 403)
    assert.equal(
      (await request(`/reports/${crypto.randomUUID()}/resolve`, owners[0], 'PATCH')).status,
      404,
    )
    assert.equal((await request('/reports/not-a-uuid/resolve', owners[0], 'PATCH')).status, 400)
    assert.deepEqual(await snapshot(), before, 'los rechazos no modifican la fila')

    const closed = await request(path, owners[0], 'PATCH', { state: 'active', type: 'lost' })
    assert.equal(closed.status, 204)
    assert.equal(closed.headers.get('cache-control'), 'no-store')
    const after = await snapshot()
    assert.deepEqual({ ...after, state: before.state, version: before.version }, before)
    assert.equal(after.state, 'resolved')
    assert.equal(after.type, 'found')
    for (const response of await Promise.all(
      Array.from({ length: 3 }, () => request(path, owners[0], 'PATCH')),
    ))
      assert.equal(response.status, 204)
    assert.equal((await snapshot()).version, after.version, 'idempotencia: no hay un UPDATE nuevo')
    assert.equal(
      (await request(path, owners[1], 'PATCH')).status,
      403,
      'un cierre previo no elimina los permisos',
    )

    await restart()
    const own = JSON.parse(await (await request('/me/reports?state=resolved', owners[0])).text())
    assert.equal(own.find((r: { id: string }) => r.id === ids[0]).type, 'found')
    const detail = await request(`/reports/${ids[0]}`, owners[0])
    assert.equal(detail.status, 200)
    assert.equal((await detail.json()).state, 'resolved')
    assert.equal((await request(`/reports/${ids[0]}`)).status, 404)
    assert.equal((await request(`/reports/${ids[0]}`, owners[1])).status, 404)
    assert.equal((await request(`/reports/${ids[0]}/contact`, owners[1])).status, 404)
    const catalog = await (await request('/reports?q=Mochila')).json()
    assert.equal(
      catalog.some((r: { id: string }) => r.id === ids[0]),
      false,
    )
    assert.equal(
      catalog.some((r: { id: string }) => r.id === ids[2]),
      true,
    )
  })
})

test('un fallo real de PostgreSQL devuelve 503 seguro y permite reintentar el cierre', async () => {
  await fixture(async ({ request, pool, owners, ids }) => {
    await pool.query('ALTER TABLE reports RENAME TO reports_unavailable')
    try {
      for (const [path, method] of [
        ['/me/reports', 'GET'],
        [`/reports/${ids[0]}/resolve`, 'PATCH'],
      ]) {
        const response = await request(path!, owners[0], method)
        assert.equal(response.status, 503)
        const message = (await response.json()).message
        assert.match(message, /^No se pudo/)
        assert.doesNotMatch(message, /reports_unavailable|postgres|SELECT|UPDATE/)
      }
    } finally {
      await pool.query('ALTER TABLE reports_unavailable RENAME TO reports')
    }
    assert.equal(
      (await pool.query('SELECT state FROM reports WHERE id = $1', [ids[0]])).rows[0].state,
      'active',
    )
    assert.equal((await request(`/reports/${ids[0]}/resolve`, owners[0], 'PATCH')).status, 204)
  })
})
