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
  return { databaseUrl, port, host: env.HOST || '127.0.0.1', auth: readAuthConfig(env) }
}
