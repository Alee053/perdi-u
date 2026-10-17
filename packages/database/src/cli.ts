import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { assertLocalDatabase, DatabaseConfigurationError, readDatabaseUrl } from './config.js'
import { createPool } from './pool.js'
import { migrate, seed } from './maintenance.js'

try {
  const envFile = new URL('../../../.env', import.meta.url)
  if (existsSync(envFile)) loadEnvFile(envFile)
  const databaseUrl = readDatabaseUrl(process.env)
  assertLocalDatabase(databaseUrl)
  const command = process.argv[2]
  if (command !== 'migrate' && command !== 'seed')
    throw new DatabaseConfigurationError('Usa migrate o seed.')
  const pool = createPool(databaseUrl)
  try {
    await (command === 'migrate' ? migrate(pool) : seed(pool))
    console.log(command === 'migrate' ? 'Migración aplicada.' : 'Seed ficticio aplicado.')
  } finally {
    await pool.end()
  }
} catch (error) {
  console.error(
    error instanceof DatabaseConfigurationError
      ? error.message
      : 'No se pudo preparar la base local. Revisa PostgreSQL y aplica primero la migración.',
  )
  process.exitCode = 1
}
