import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto'

// Prints new local Auth secrets for the ignored root .env; nothing is written or sent.
const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
const signingKey = {
  ...privateKey.export({ format: 'jwk' }),
  kid: randomUUID(),
  use: 'sig',
  key_ops: ['sign', 'verify'],
  alg: 'ES256',
}
console.log(`AUTH_DB_PASSWORD=${randomBytes(24).toString('hex')}`)
console.log(`AUTH_JWT_SECRET=${randomBytes(32).toString('hex')}`)
console.log(`AUTH_JWT_KEYS='${JSON.stringify([signingKey])}'`)
