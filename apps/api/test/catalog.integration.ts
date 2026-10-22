import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { expect, test } from '@jest/globals'
import { createApplication } from '../src/app.js'
import {
  createAccessTokenVerifier,
  InvalidAccessToken,
  type AccessTokenVerifier,
} from '../src/auth/access-token.js'
import { createPool, PostgresReportRepository } from '@perdiu/database'
import { migrate, seed } from '@perdiu/database/maintenance'
import { assertLocalDatabase } from '@perdiu/database/config'

// The public catalog never consults Auth; no key can verify a session here.
const noSessions = createAccessTokenVerifier(
  async () => {
    throw new Error('El catálogo no debe verificar sesiones.')
  },
  { issuer: 'http://localhost/auth', audience: 'authenticated' },
)
const publisherId = 'b4c2e551-3c4b-4cce-8e79-883c862bd75f'
const publisherSession = '1cc8c2d5-1524-4221-8585-442fc53de052'
const secondPublisherId = 'd4c2e551-3c4b-4cce-8e79-883c862bd75f'
const publishVerifier: AccessTokenVerifier = {
  async verify(token) {
    if (token !== 'verified-publication-token') throw new InvalidAccessToken()
    return { id: publisherId, email: 'privado@example.test', sessionId: publisherSession }
  },
}
const mediaVerifier: AccessTokenVerifier = {
  async verify(token) {
    if (token === 'verified-publication-token')
      return { id: publisherId, email: 'privado@example.test', sessionId: publisherSession }
    if (token === 'verified-second-publication-token')
      return {
        id: secondPublisherId,
        email: 'otro@example.test',
        sessionId: '2cc8c2d5-1524-4221-8585-442fc53de052',
      }
    throw new InvalidAccessToken()
  },
}

async function resetCatalog(pool: ReturnType<typeof createPool>) {
  assert.equal(
    process.env.PERDIU_TEST_CONTAINER,
    '1',
    'La limpieza solo se permite en el contenedor desechable.',
  )
  await migrate(pool)
  await pool.query('TRUNCATE TABLE profiles CASCADE')
}

async function runDatabaseCommand(command: 'migrate' | 'seed', databaseUrl: string) {
  const code = await new Promise<number | null>((resolve, reject) => {
    const child = spawn('pnpm', [`db:${command}`], {
      cwd: new URL('../../../', import.meta.url),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        NODE_ENV: 'test',
        PORT: 'invalid-http-port',
      },
      stdio: 'ignore',
      // Windows resolves pnpm to a .cmd shim, which Node only runs through a shell.
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('exit', resolve)
  })
  assert.equal(code, 0, `El comando ${command} debe preparar la base local.`)
}

test('catálogo HTTP y repositorio conservan datos reales tras reiniciar, sin información privada', async () => {
  assert.equal(
    process.env.PERDIU_TEST_CONTAINER,
    '1',
    'Ejecuta pnpm test:integration para usar PostgreSQL aislado.',
  )
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl, 'Falta configuración de PostgreSQL de pruebas.')
  assertLocalDatabase(databaseUrl)
  const pool = createPool(databaseUrl)
  let app: Awaited<ReturnType<typeof createApplication>> | undefined
  try {
    await resetCatalog(pool)
    await migrate(pool)
    await runDatabaseCommand('migrate', databaseUrl)
    assert.deepEqual(await new PostgresReportRepository(pool).list(), [])
    await seed(pool)
    await runDatabaseCommand('seed', databaseUrl)
    const records = await new PostgresReportRepository(pool).list()
    assert.deepEqual(
      records.map(({ id }) => id),
      ['20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'],
    )
    await pool.query(
      "UPDATE reports SET created_at = created_at - interval '1 second' WHERE id = $1",
      [records[0]!.id],
    )
    await seed(pool)

    const start = async () => {
      app = await createApplication(databaseUrl, noSessions)
      await app.listen(0, '127.0.0.1')
      return `${await app.getUrl()}/reports`
    }
    let endpoint = await start()
    const response = await fetch(endpoint)
    assert.equal(response.status, 200)
    const catalog = await response.json()
    expect(catalog.map((report: { id: string }) => report.id)).toStrictEqual([
      records[1]!.id,
      records[0]!.id,
    ])
    assert.deepEqual(Object.keys(catalog[0]).sort(), [
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
    assert.deepEqual(Object.keys(catalog[1].author).sort(), ['displayName', 'id'])
    expect(catalog[1].imageUrls).toStrictEqual(['/images/object.svg'])
    assert.ok(
      !/phone|email|token|storageKey|storage_key|59170000001|fictional@example\.invalid|fixture-private-storage-key/.test(
        JSON.stringify(catalog),
      ),
    )
    await app!.close()
    app = undefined
    endpoint = await start()
    assert.deepEqual(await (await fetch(endpoint)).json(), catalog)

    await pool.query('UPDATE reports SET created_at = $1 WHERE id = $2', [
      '2026-10-12T12:00:00.123100Z',
      records[0]!.id,
    ])
    await pool.query('UPDATE reports SET created_at = $1 WHERE id = $2', [
      '2026-10-12T12:00:00.123900Z',
      records[1]!.id,
    ])
    const precise = await (await fetch(endpoint)).json()
    expect(
      precise.map((report: { id: string; createdAt: string }) => [report.id, report.createdAt]),
    ).toStrictEqual([
      [records[1]!.id, '2026-10-12T12:00:00.123900Z'],
      [records[0]!.id, '2026-10-12T12:00:00.123100Z'],
    ])

    await pool.query('ALTER TABLE reports RENAME TO unavailable_reports')
    try {
      const failed = await fetch(endpoint)
      assert.equal(failed.status, 503)
      assert.equal(
        (await failed.json()).message,
        'No se pudo cargar el catálogo. Intenta nuevamente.',
      )
    } finally {
      await pool.query('ALTER TABLE unavailable_reports RENAME TO reports')
    }
    await pool.query('UPDATE reports SET state = $1', ['resolved'])
    expect(await (await fetch(endpoint)).json()).toStrictEqual([])
    await pool.query('UPDATE reports SET state = $1 WHERE id = ANY($2::uuid[])', [
      'active',
      records.map(({ id }) => id),
    ])
    console.log(
      'PostgreSQL: migración/seed repetibles, activos, orden, privacidad, vacío, error y reinicio verificados.',
    )
  } finally {
    await app?.close()
    await pool.end()
  }
})

test('POST /reports exige sesión, persiste el reporte y conserva privado el WhatsApp', async () => {
  assert.equal(process.env.PERDIU_TEST_CONTAINER, '1')
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  assertLocalDatabase(databaseUrl)
  const pool = createPool(databaseUrl)
  let app: Awaited<ReturnType<typeof createApplication>> | undefined
  try {
    await resetCatalog(pool)
    app = await createApplication(databaseUrl, publishVerifier)
    await app.listen(0, '127.0.0.1')
    const endpoint = `${await app.getUrl()}/reports`
    const draft = {
      type: 'found',
      category: 'pet',
      petSpecies: ' Perro ',
      title: '  Luna  ',
      description: '  Perrita café vista cerca del mercado.  ',
      city: ' La Paz ',
      zone: ' Sopocachi ',
      incidentDate: '2026-10-20',
      phone: '+591 70000000',
      ownerId: 'attacker',
      state: 'resolved',
    }
    const unauthenticated = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(draft),
    })
    assert.equal(unauthenticated.status, 401)

    const invalid = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: 'Bearer verified-publication-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ...draft, description: 'Corta.' }),
    })
    assert.equal(invalid.status, 400)
    assert.equal((await pool.query('SELECT id FROM reports')).rowCount, 0)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: 'Bearer verified-publication-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify(draft),
    })
    assert.equal(response.status, 201)
    const published = JSON.parse(await response.text())
    assert.deepEqual(Object.keys(published).sort(), [
      'author',
      'category',
      'city',
      'createdAt',
      'description',
      'id',
      'imageUrls',
      'incidentDate',
      'petSpecies',
      'state',
      'title',
      'type',
      'zone',
    ])
    assert.equal(published.ownerId, undefined)
    assert.deepEqual(
      await pool
        .query(
          `SELECT r.owner_id AS "ownerId", r.state, r.title, r.pet_species AS "petSpecies", c.phone
         FROM reports r JOIN report_contacts c ON c.report_id = r.id WHERE r.id = $1`,
          [published.id],
        )
        .then((result) => result.rows[0]),
      {
        ownerId: publisherId,
        state: 'active',
        title: 'Luna',
        petSpecies: 'Perro',
        phone: '+59170000000',
      },
    )
    assert.ok(!JSON.stringify(published).includes('+59170000000'))
    await app.close()
    app = undefined

    app = await createApplication(databaseUrl, noSessions)
    await app.listen(0, '127.0.0.1')
    const catalog = await fetch(`${await app.getUrl()}/reports`)
    assert.equal(catalog.status, 200)
    assert.deepEqual(JSON.parse(await catalog.text()), [published])
  } finally {
    await app?.close()
    await pool.end()
  }
})

test('el recorrido de medios privado valida, asocia en transacción y sirve solo fotos publicadas', async () => {
  assert.equal(process.env.PERDIU_TEST_CONTAINER, '1')
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  assertLocalDatabase(databaseUrl)
  const pool = createPool(databaseUrl)
  const objects = new Map<string, { contentType: string; bytes: Uint8Array }>()
  const mediaStorage = {
    async put(key: string, contentType: string, bytes: Uint8Array) {
      objects.set(key, { contentType, bytes: new Uint8Array(bytes) })
    },
    async get(key: string) {
      return objects.get(key)?.bytes
    },
    async delete(key: string) {
      objects.delete(key)
    },
  }
  let app: Awaited<ReturnType<typeof createApplication>> | undefined
  try {
    await resetCatalog(pool)
    app = await createApplication(databaseUrl, mediaVerifier, { mediaStorage })
    await app.listen(0, '127.0.0.1')
    const base = await app.getUrl()

    const upload = async (token: string, name = 'foto.txt') => {
      const form = new FormData()
      form.append(
        'file',
        new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], {
          type: 'text/plain',
        }),
        name,
      )
      return fetch(`${base}/media`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: form,
      })
    }
    const unauthorized = new FormData()
    unauthorized.append('file', new Blob(['not authorized']), 'foto.png')
    assert.equal((await fetch(`${base}/media`, { method: 'POST', body: unauthorized })).status, 401)

    const uploaded = await upload('verified-publication-token')
    assert.equal(uploaded.status, 201)
    const mediaBody = await uploaded.json()
    assert.deepEqual(Object.keys(mediaBody), ['id'])
    const mediaId = mediaBody.id as string
    assert.equal(objects.size, 1)
    assert.equal((await fetch(`${base}/media/${mediaId}`)).status, 404)

    const reportDraft = {
      type: 'found',
      category: 'object',
      title: 'Mochila azul',
      description: 'Mochila azul encontrada cerca del mercado central.',
      city: 'La Paz',
      zone: 'Sopocachi',
      incidentDate: '2026-10-20',
      phone: '+591 70000000',
      mediaIds: [mediaId],
    }
    const crossOwner = await fetch(`${base}/reports`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer verified-second-publication-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify(reportDraft),
    })
    assert.equal(crossOwner.status, 400)
    const rejectedFields = (await crossOwner.json()).fieldErrors
    assert.equal(rejectedFields.mediaIds, 'invalid')
    assert.equal(Object.keys(rejectedFields).length, 1)
    assert.equal(await pool.query('SELECT id FROM reports').then(({ rowCount }) => rowCount), 0)

    const response = await fetch(`${base}/reports`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer verified-publication-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify(reportDraft),
    })
    assert.equal(response.status, 201)
    const published = await response.json()
    assert.equal(published.imageUrls.length, 1)
    assert.equal(published.imageUrls[0], `/api/media/${mediaId}`)
    assert.ok(!JSON.stringify(published).includes('report-media/'))
    const image = await fetch(`${base}/media/${mediaId}`)
    assert.equal(image.status, 200)
    assert.equal(image.headers.get('content-type'), 'image/png')
    assert.equal(
      Array.from(new Uint8Array(await image.arrayBuffer())).join(','),
      '137,80,78,71,13,10,26,10',
    )

    const reused = await fetch(`${base}/reports`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer verified-publication-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify(reportDraft),
    })
    assert.equal(reused.status, 400)
    assert.equal(await pool.query('SELECT id FROM reports').then(({ rowCount }) => rowCount), 1)

    const unattached = await Promise.all([
      upload('verified-publication-token', 'one.png'),
      upload('verified-publication-token', 'two.png'),
      upload('verified-publication-token', 'three.png'),
    ])
    for (const uploadedMedia of unattached) assert.equal(uploadedMedia.status, 201)
    const overLimit = await upload('verified-publication-token', 'four.png')
    assert.equal(overLimit.status, 400)
    assert.equal(objects.size, 4, 'el objeto del upload rechazado se elimina')
    const unattachedId = (await unattached[0]!.json()).id as string
    assert.equal(
      (
        await fetch(`${base}/media/${unattachedId}`, {
          method: 'DELETE',
          headers: { authorization: 'Bearer verified-second-publication-token' },
        })
      ).status,
      404,
    )
    assert.equal(
      (
        await fetch(`${base}/media/${unattachedId}`, {
          method: 'DELETE',
          headers: { authorization: 'Bearer verified-publication-token' },
        })
      ).status,
      204,
    )
    assert.equal(objects.size, 3)
  } finally {
    await app?.close()
    await pool.end()
  }
})

test('el proceso falla con diagnóstico seguro ante configuración ausente o conexión inválida', async () => {
  for (const databaseUrl of [
    '',
    'postgresql://perdiu:startup-secret-sentinel@127.0.0.1:1/perdiu_test',
  ]) {
    const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
      const child = spawn(process.execPath, ['dist/main.js'], {
        cwd: new URL('../', import.meta.url),
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          AUTH_JWKS_URL: 'http://127.0.0.1:1/.well-known/jwks.json',
          AUTH_JWT_ISSUER: 'http://localhost/auth',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let output = ''
      child.stdout.on('data', (chunk) => {
        output += chunk
      })
      child.stderr.on('data', (chunk) => {
        output += chunk
      })
      child.on('error', reject)
      child.on('exit', (code) => resolve({ code, output }))
    })
    assert.equal(result.code, 1)
    assert.ok(!result.output.includes('startup-secret-sentinel'))
    assert.ok(!result.output.includes('postgresql://'))
    assert.match(result.output, /DATABASE_URL|No se pudo iniciar la API/)
  }
})

test('la búsqueda HTTP normaliza texto, combina filtros y valida entradas sobre PostgreSQL', async () => {
  assert.equal(process.env.PERDIU_TEST_CONTAINER, '1')
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  assertLocalDatabase(databaseUrl)
  const pool = createPool(databaseUrl)
  let app: Awaited<ReturnType<typeof createApplication>> | undefined
  let prepared = false
  try {
    await resetCatalog(pool)
    prepared = true
    await seed(pool)
    await pool.query(
      await readFile(
        new URL('../../../packages/database/test/fixtures/search.sql', import.meta.url),
        'utf8',
      ),
    )
    app = await createApplication(databaseUrl, noSessions)
    await app.listen(0, '127.0.0.1')
    const endpoint = `${await app.getUrl()}/reports`
    for (const q of ['camara', 'CÁMARA', 'ca\u0301mara', '  camara  ']) {
      const response = await fetch(`${endpoint}?${new URLSearchParams({ q })}`)
      assert.equal(response.status, 200)
      const reports = await response.json()
      expect(reports.map((report: { id: string }) => report.id)).toStrictEqual([
        '30000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000002',
      ])
    }
    for (const [query, expected] of [
      [
        { q: 'camara', type: 'lost', category: 'object', city: 'La Paz' },
        ['30000000-0000-0000-0000-000000000001'],
      ],
      [
        { q: 'camara', type: 'found', category: 'pet', city: 'Cochabamba' },
        ['30000000-0000-0000-0000-000000000002'],
      ],
      [{ category: 'document', city: 'La Paz' }, ['30000000-0000-0000-0000-000000000003']],
      [{ q: 'camara', category: 'document' }, []],
      [{ q: 'camara', city: 'Santa Cruz' }, []],
      [{ q: 'Centro' }, []],
      [{ q: "O'Reilly" }, ['30000000-0000-0000-0000-000000000004']],
      [{ q: '%_' }, ['30000000-0000-0000-0000-000000000004']],
      [{ q: "' OR true --" }, []],
    ] satisfies [Record<string, string>, string[]][]) {
      const response = await fetch(`${endpoint}?${new URLSearchParams(query)}`)
      assert.equal(response.status, 200)
      expect((await response.json()).map((report: { id: string }) => report.id)).toStrictEqual(
        expected,
      )
    }
    for (const query of [
      'type=resolved',
      'category=invalid',
      'type=lost&type=found',
      'q=a&q=b',
      'q[x]=a',
      'city=' + 'x'.repeat(101),
      'q=' + 'x'.repeat(201),
      'q=%00',
      'limit=100',
    ]) {
      const response = await fetch(`${endpoint}?${query}`)
      assert.equal(response.status, 400, query)
      assert.equal((await response.json()).message, 'Parámetros de búsqueda inválidos.')
    }
    assert.deepEqual(
      await (await fetch(`${endpoint}?q=%20%20`)).json(),
      await (await fetch(endpoint)).json(),
    )
    await pool.query(
      await readFile(
        new URL('../../../packages/database/test/fixtures/limit.sql', import.meta.url),
        'utf8',
      ),
    )
    const limited = await (await fetch(`${endpoint}?q=limite`)).json()
    assert.equal(limited.length, 50)
    assert.equal(limited[0].id, '40000000-0000-0000-0000-000000000001')
    assert.equal(limited[49].id, '40000000-0000-0000-0000-000000000050')
    assert.equal((await (await fetch(endpoint)).json()).length, 50)
  } finally {
    await app?.close()
    if (prepared)
      await pool.query(
        "DELETE FROM reports WHERE id::text LIKE '30000000-%' OR id::text LIKE '40000000-%'",
      )
    await pool.end()
  }
})
