import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { createApplication } from '../src/app.js'
import {
  createRemoteAccessTokenVerifier,
  type AccessTokenVerifier,
} from '../src/auth/access-token.js'
import { createPool } from '@perdiu/database'
import { assertLocalDatabase } from '@perdiu/database/config'
import { migrate } from '@perdiu/database/maintenance'
import { audience, issuer, jwksServer, signingKey, subject } from './support/auth.js'

async function withApi(verifier: AccessTokenVerifier, run: (url: string) => Promise<void>) {
  assert.equal(process.env.PERDIU_TEST_CONTAINER, '1', 'Ejecuta pnpm test:integration.')
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl, 'Falta configuración de PostgreSQL de pruebas.')
  assertLocalDatabase(databaseUrl)
  const pool = createPool(databaseUrl)
  try {
    await migrate(pool)
  } finally {
    await pool.end()
  }
  const app = await createApplication(databaseUrl, verifier)
  try {
    await app.listen(0, '127.0.0.1')
    await run(await app.getUrl())
  } finally {
    await app.close()
  }
}

test('GET /me exige un bearer verificado y responde solo la identidad del sujeto', async () => {
  const key = await signingKey('current')
  const jwks = await jwksServer([key.jwk])
  try {
    await withApi(createRemoteAccessTokenVerifier(jwks.url, { issuer, audience }), async (url) => {
      const me = (authorization?: string) =>
        fetch(`${url}/me?id=10000000-0000-0000-0000-000000000001`, {
          headers: authorization ? { authorization } : {},
        })

      const valid = await me(`Bearer ${await key.sign({ user_metadata: { name: 'Otra' } })}`)
      assert.equal(valid.status, 200)
      // Parse in the test realm so deepEqual compares content, not prototypes.
      assert.deepEqual(JSON.parse(await valid.text()), {
        id: subject,
        email: 'persona@example.test',
      })

      const jwt = await key.sign()
      const [header, payload, signature] = jwt.split('.')
      const forged = Buffer.from(
        Buffer.from(payload!, 'base64url').toString().replace(subject, crypto.randomUUID()),
      ).toString('base64url')
      for (const authorization of [
        undefined,
        `Basic ${Buffer.from('persona:clave').toString('base64')}`,
        `Bearer ${jwt} extra`,
        `Bearer ${header}.${forged}.${signature}`,
        `Bearer ${await key.sign({}, Math.floor(Date.now() / 1000) - 60)}`,
        `Bearer ${await (await signingKey('current')).sign()}`,
      ]) {
        const response = await me(authorization)
        assert.equal(response.status, 401, String(authorization).slice(0, 30))
        assert.equal(response.headers.get('www-authenticate'), 'Bearer')
        assert.deepEqual(JSON.parse(await response.text()), {
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Inicia sesión para continuar.',
        })
      }

      const catalog = await fetch(`${url}/reports`)
      assert.equal(catalog.status, 200, 'el catálogo sigue siendo público')
    })
  } finally {
    await jwks.close()
  }
})

test('si Auth no publica claves, GET /me responde 503 sin aceptar la credencial', async () => {
  const key = await signingKey('unreachable')
  const jwks = await jwksServer([key.jwk])
  await jwks.close()
  await withApi(createRemoteAccessTokenVerifier(jwks.url, { issuer, audience }), async (url) => {
    const response = await fetch(`${url}/me`, {
      headers: { authorization: `Bearer ${await key.sign()}` },
    })
    assert.equal(response.status, 503)
    assert.equal(
      (await response.json()).message,
      'No se pudo verificar la sesión. Intenta nuevamente.',
    )
  })
})

test('cerrar sesión en la API revoca ese token, también después de reiniciar NestJS', async () => {
  const key = await signingKey('logout')
  const jwks = await jwksServer([key.jwk])
  const closing = await key.sign({ session_id: crypto.randomUUID() })
  const other = await key.sign({ session_id: crypto.randomUUID() })
  const verifier = createRemoteAccessTokenVerifier(jwks.url, { issuer, audience })
  const request = (url: string, path: string, token?: string, method = 'GET') =>
    fetch(`${url}${path}`, {
      method,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
  try {
    await withApi(verifier, async (url) => {
      assert.equal((await request(url, '/me', closing)).status, 200)
      assert.equal((await request(url, '/me/logout', undefined, 'POST')).status, 401)

      const logout = await request(url, '/me/logout', closing, 'POST')
      assert.equal(logout.status, 204)
      assert.equal(logout.headers.get('cache-control'), 'no-store')

      const reused = await request(url, '/me', closing)
      assert.equal(reused.status, 401, 'el mismo token no vuelve a consultar datos privados')
      assert.equal((await reused.json()).message, 'Inicia sesión para continuar.')
      assert.equal((await request(url, '/me/logout', closing, 'POST')).status, 401)
      assert.equal((await request(url, '/me', other)).status, 200, 'otra sesión sigue activa')
    })
    await withApi(verifier, async (url) => {
      assert.equal((await request(url, '/me', closing)).status, 401, 'tras reiniciar la API')
      assert.equal((await request(url, '/me', other)).status, 200)
    })
  } finally {
    await jwks.close()
  }
})

test('GET /me agrega nombre y foto del perfil propio, sin contacto privado ni otras cuentas', async () => {
  const key = await signingKey('profile')
  const jwks = await jwksServer([key.jwk])
  const [owner, withoutPhoto, other] = [
    crypto.randomUUID(),
    crypto.randomUUID(),
    crypto.randomUUID(),
  ]
  try {
    await withApi(createRemoteAccessTokenVerifier(jwks.url, { issuer, audience }), async (url) => {
      const pool = createPool(process.env.TEST_DATABASE_URL!)
      try {
        await pool.query(
          `INSERT INTO profiles (id, display_name, photo_url) VALUES
             ($1, 'Persona Ficticia', 'https://images.example.test/persona.png'),
             ($2, 'Sin Foto', NULL),
             ($3, 'Otra Cuenta', 'https://images.example.test/otra.png')`,
          [owner, withoutPhoto, other],
        )
        await pool.query(
          "INSERT INTO profile_contacts (profile_id, email) VALUES ($1, 'contacto-privado@example.test')",
          [owner],
        )
      } finally {
        await pool.end()
      }
      const me = async (sub: string) => {
        const response = await fetch(`${url}/me?id=${other}`, {
          headers: { authorization: `Bearer ${await key.sign({ sub })}` },
        })
        assert.equal(response.status, 200)
        assert.equal(response.headers.get('cache-control'), 'no-store')
        return JSON.parse(await response.text())
      }

      assert.deepEqual(await me(owner), {
        id: owner,
        email: 'persona@example.test',
        displayName: 'Persona Ficticia',
        photoUrl: 'https://images.example.test/persona.png',
      })
      assert.deepEqual(await me(withoutPhoto), {
        id: withoutPhoto,
        email: 'persona@example.test',
        displayName: 'Sin Foto',
      })
    })
  } finally {
    await jwks.close()
  }
})
