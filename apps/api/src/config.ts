import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { readDatabaseUrl } from '@perdiu/database/config'

export interface ApiConfig {
  databaseUrl: string
  port: number
  host: string
}

export class ConfigurationError extends Error {}

export function loadEnvironment() {
  const path = new URL('../../../.env', import.meta.url)
  if (existsSync(path)) loadEnvFile(path)
}

export function readConfig(env: NodeJS.ProcessEnv): ApiConfig {
  const databaseUrl = readDatabaseUrl(env)
  const port = Number(env.PORT ?? 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new ConfigurationError('PORT debe ser un entero entre 1 y 65535.')
  return { databaseUrl, port, host: env.HOST || '127.0.0.1' }
}
