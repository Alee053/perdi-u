import { existsSync } from 'node:fs'
import { readDatabaseUrl } from '@perdiu/database/config'

export interface AuthConfig {
  jwksUrl: string
  issuer: string
  audience: string
}

export interface ApiConfig {
  databaseUrl: string
  port: number
  host: string
  auth: AuthConfig
  r2?: R2Config
}

export interface R2Config {
  accountId: string
  bucketName: string
  accessKeyId: string
  secretAccessKey: string
}

export class ConfigurationError extends Error {}

export function loadEnvironment() {
  const path = new URL('../../../.env', import.meta.url)
  // Global process: importing from node:process hangs under tsx watch (pnpm dev) on Windows.
  if (existsSync(path)) process.loadEnvFile(path)
}

function publicUrl(value: string | undefined) {
  try {
    const url = new URL(value ?? '')
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
  } catch {
    return false
  }
}

/** The API only needs Auth's public keys; signing secrets stay in the Auth service. */
function readAuthConfig(env: NodeJS.ProcessEnv): AuthConfig {
  if (!publicUrl(env.AUTH_JWKS_URL) || !publicUrl(env.AUTH_JWT_ISSUER))
    throw new ConfigurationError(
      'AUTH_JWKS_URL y AUTH_JWT_ISSUER deben ser URLs http(s) de Supabase Auth, sin credenciales.',
    )
  return {
    jwksUrl: env.AUTH_JWKS_URL!,
    issuer: env.AUTH_JWT_ISSUER!,
    audience: env.AUTH_JWT_AUDIENCE || 'authenticated',
  }
}

export function readConfig(env: NodeJS.ProcessEnv): ApiConfig {
  const databaseUrl = readDatabaseUrl(env)
  const port = Number(env.PORT ?? 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new ConfigurationError('PORT debe ser un entero entre 1 y 65535.')
  const r2Values = [
    env.R2_ACCOUNT_ID,
    env.R2_BUCKET_NAME,
    env.R2_ACCESS_KEY_ID,
    env.R2_SECRET_ACCESS_KEY,
  ]
  const hasR2Config = r2Values.some((value) => value !== undefined && value !== '')
  if (hasR2Config && r2Values.some((value) => !value?.trim()))
    throw new ConfigurationError('Configura todas las variables de R2 para habilitar las fotos.')
  const r2 = hasR2Config
    ? {
        accountId: env.R2_ACCOUNT_ID!.trim(),
        bucketName: env.R2_BUCKET_NAME!.trim(),
        accessKeyId: env.R2_ACCESS_KEY_ID!.trim(),
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!.trim(),
      }
    : undefined
  return {
    databaseUrl,
    port,
    host: env.HOST || '127.0.0.1',
    auth: readAuthConfig(env),
    ...(r2 && { r2 }),
  }
}
