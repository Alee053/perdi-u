import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose'

/** Identity taken exclusively from a verified Supabase Auth access token. */
export interface AuthenticatedUser {
  id: string
  email: string
  sessionId: string
}

export interface AccessTokenVerifier {
  verify(token: string): Promise<AuthenticatedUser>
}

export interface AccessTokenOptions {
  issuer: string
  audience: string
}

/** The credential is missing, forged, expired or not issued for PerdiU users. */
export class InvalidAccessToken extends Error {}
/** The signing keys could not be obtained; the credential was not judged. */
export class AuthUnavailable extends Error {}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function createAccessTokenVerifier(
  keys: JWTVerifyGetKey,
  { issuer, audience }: AccessTokenOptions,
): AccessTokenVerifier {
  return {
    async verify(token) {
      let payload
      try {
        // Asymmetric keys only: HS256 or "none" never reach the signature check.
        ;({ payload } = await jwtVerify(token, keys, {
          issuer,
          audience,
          algorithms: ['ES256'],
          requiredClaims: ['sub', 'exp', 'iat', 'session_id'],
        }))
      } catch (error) {
        if (error instanceof errors.JOSEError && error.code !== 'ERR_JWKS_TIMEOUT')
          throw new InvalidAccessToken()
        throw new AuthUnavailable()
      }
      const { sub, email, session_id: sessionId, role, is_anonymous: anonymous } = payload
      if (
        typeof sub !== 'string' ||
        !uuid.test(sub) ||
        typeof sessionId !== 'string' ||
        !uuid.test(sessionId) ||
        typeof email !== 'string' ||
        !email ||
        role !== 'authenticated' ||
        anonymous === true
      )
        throw new InvalidAccessToken()
      return { id: sub, email, sessionId }
    },
  }
}

/** Verifies tokens with the public keys that Auth publishes; no shared secret is needed. */
export function createRemoteAccessTokenVerifier(jwksUrl: string, options: AccessTokenOptions) {
  return createAccessTokenVerifier(
    createRemoteJWKSet(new URL(jwksUrl), { timeoutDuration: 3000, cooldownDuration: 30000 }),
    options,
  )
}
