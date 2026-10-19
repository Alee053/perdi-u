import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWK } from 'jose'
import {
  AuthUnavailable,
  createAccessTokenVerifier,
  InvalidAccessToken,
  withSessionRevocation,
} from '../src/auth/access-token.js'

const issuer = 'http://localhost:5173/auth'
const audience = 'authenticated'
const subject = '66068112-224a-4d11-a6cd-c18bdd1ffb1b'
const sessionId = '0f65b873-1ea9-4b59-81de-56f745131eb9'

async function signingKey(kid = 'test-key') {
  const { privateKey, publicKey } = await generateKeyPair('ES256')
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid, alg: 'ES256', use: 'sig' }
  return { privateKey, jwk, kid }
}

function token(claims: Record<string, unknown> = {}) {
  return new SignJWT({
    email: 'persona@example.test',
    role: 'authenticated',
    session_id: sessionId,
    is_anonymous: false,
    ...claims,
  })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime('15m')
}

test('un access token ES256 de Auth entrega solo la identidad verificada', async () => {
  const key = await signingKey()
  const verifier = createAccessTokenVerifier(createLocalJWKSet({ keys: [key.jwk] }), {
    issuer,
    audience,
  })
  const jwt = await token({ user_metadata: { display_name: 'Nombre elegido por el cliente' } })
    .setProtectedHeader({ alg: 'ES256', kid: key.kid })
    .sign(key.privateKey)

  assert.deepEqual(await verifier.verify(jwt), {
    id: subject,
    email: 'persona@example.test',
    sessionId,
  })
  const [header, payload, signature] = jwt.split('.')
  const tampered = Buffer.from(payload!, 'base64url')
    .toString()
    .replace(subject, '10000000-0000-0000-0000-000000000001')
  await assert.rejects(
    verifier.verify(`${header}.${Buffer.from(tampered).toString('base64url')}.${signature}`),
    InvalidAccessToken,
  )
})

test('se rechazan tokens vencidos, ajenos, simétricos, sin sesión o anónimos', async () => {
  const key = await signingKey()
  const other = await signingKey('other-key')
  const verifier = createAccessTokenVerifier(createLocalJWKSet({ keys: [key.jwk] }), {
    issuer,
    audience,
  })
  const sign = (jwt: SignJWT, signer = key) =>
    jwt.setProtectedHeader({ alg: 'ES256', kid: signer.kid }).sign(signer.privateKey)
  const unsigned = (claims: Record<string, unknown>) =>
    [
      Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
      Buffer.from(JSON.stringify(claims)).toString('base64url'),
      '',
    ].join('.')
  const now = Math.floor(Date.now() / 1000)

  for (const credential of [
    '',
    'not-a-jwt',
    await sign(
      token()
        .setIssuedAt(now - 3600)
        .setExpirationTime(now - 60),
    ),
    await sign(token().setIssuer('https://otro-proyecto.example/auth')),
    await sign(token().setAudience('service_role')),
    await sign(token({ role: 'service_role' })),
    await sign(token({ is_anonymous: true })),
    await sign(token({ session_id: undefined })),
    await sign(token({ email: undefined })),
    await sign(token().setSubject('Santiago Demo')),
    await sign(token(), other),
    await token()
      .setProtectedHeader({ alg: 'HS256' })
      .sign(new TextEncoder().encode('a-shared-secret-that-the-api-must-not-accept')),
    unsigned({ sub: subject, iss: issuer, aud: audience, exp: now + 600, iat: now }),
  ])
    await assert.rejects(verifier.verify(credential), InvalidAccessToken, credential.slice(0, 40))
})

test('si Auth no entrega sus claves, la API informa indisponibilidad y no un token inválido', async () => {
  const key = await signingKey()
  const verifier = createAccessTokenVerifier(
    async () => {
      throw new TypeError('fetch failed: private-network-sentinel')
    },
    { issuer, audience },
  )
  const jwt = await token().setProtectedHeader({ alg: 'ES256', kid: key.kid }).sign(key.privateKey)
  await assert.rejects(verifier.verify(jwt), AuthUnavailable)
})

test('un token de una sesión revocada se rechaza aunque su firma siga vigente', async () => {
  const key = await signingKey()
  const revoked = new Set<string>()
  let failing = false
  const verifier = withSessionRevocation(
    createAccessTokenVerifier(createLocalJWKSet({ keys: [key.jwk] }), { issuer, audience }),
    {
      revoke: async (id) => void revoked.add(id),
      isRevoked: async (id) => {
        if (failing) throw new Error('postgres-sentinel')
        return revoked.has(id)
      },
    },
  )
  const sign = (claims: Record<string, unknown> = {}) =>
    token(claims).setProtectedHeader({ alg: 'ES256', kid: key.kid }).sign(key.privateKey)
  const current = await sign()
  const other = await sign({ session_id: '7d2b4c39-8a3e-4c51-9b0f-2f6d1e8a4c10' })

  assert.equal((await verifier.verify(current)).sessionId, sessionId)
  revoked.add(sessionId)
  await assert.rejects(verifier.verify(current), InvalidAccessToken)
  await assert.rejects(verifier.verify(await sign()), InvalidAccessToken, 'tokens renovados')
  assert.equal((await verifier.verify(other)).id, subject, 'otras sesiones siguen activas')
  failing = true
  await assert.rejects(verifier.verify(other), AuthUnavailable, 'sin registro no se acepta')
})
