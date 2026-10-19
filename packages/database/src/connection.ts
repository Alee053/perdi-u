import type { ReportRepository } from '@perdiu/catalog'
import { createPool } from './pool.js'
import { PostgresReportRepository } from './postgres-repository.js'
import { PostgresProfileRepository } from './profiles.js'
import { PostgresSessionRevocations } from './session-revocations.js'

export interface Database {
  reports: ReportRepository
  profiles: PostgresProfileRepository
  sessions: PostgresSessionRevocations
  close(): Promise<void>
}

/** Owns the pool and connection check; callers compose repositories and release the database. */
export async function openDatabase(databaseUrl: string): Promise<Database> {
  const pool = createPool(databaseUrl)
  try {
    await pool.query('SELECT 1')
    return {
      reports: new PostgresReportRepository(pool),
      profiles: new PostgresProfileRepository(pool),
      sessions: new PostgresSessionRevocations(pool),
      close: () => pool.end(),
    }
  } catch (error) {
    await pool.end()
    throw error
  }
}
