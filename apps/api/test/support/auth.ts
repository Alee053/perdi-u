import { createServer } from 'node:http'
import { SignJWT, exportJWK, generateKeyPair, type JWK } from 'jose'

export const issuer = 'http://localhost:5173/auth'
export const audience = 'authenticated'
export const subject = '66068112-224a-4d11-a6cd-c18bdd1ffb1b'

export async function signingKey(kid: string) {
  const { privateKey, publicKey } = await generateKeyPair('ES256')
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid, alg: 'ES256', use: 'sig' }
  const sign = (claims: Record<string, unknown> = {}, expiresAt: string | number = '15m') =>
    new SignJWT({
      email: 'persona@example.test',
      role: 'authenticated',
      session_id: '0f65b873-1ea9-4b59-81de-56f745131eb9',
      ...claims,
    })
      .setProtectedHeader({ alg: 'ES256', kid })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject(typeof claims.sub === 'string' ? claims.sub : subject)
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(privateKey)
  return { jwk, sign }
}

/** Serves a JWKS like Auth's /.well-known/jwks.json, so the real remote fetch is exercised. */
export async function jwksServer(keys: JWK[]) {
  const server = createServer((request, response) => {
    if (request.url !== '/.well-known/jwks.json') return void response.writeHead(404).end()
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ keys }))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as { port: number }
  return {
    url: `http://127.0.0.1:${port}/.well-known/jwks.json`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}
