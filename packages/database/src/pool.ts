import { Pool } from 'pg'

export function createPool(databaseUrl: string) {
  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  })
  pool.on('error', () =>
    console.error('PostgreSQL no está disponible; se cerró una conexión inactiva.'),
  )
  return pool
}
