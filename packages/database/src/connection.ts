import type { ReportRepository } from '@perdiu/catalog'
import { createPool } from './pool.js'
import { PostgresReportRepository } from './postgres-repository.js'

export interface Database {
  reports: ReportRepository
  close(): Promise<void>
}

/** Owns the pool and connection check; callers compose repositories and release the database. */
export async function openDatabase(databaseUrl: string): Promise<Database> {
  const pool = createPool(databaseUrl)
  try {
    await pool.query('SELECT 1')
    return { reports: new PostgresReportRepository(pool), close: () => pool.end() }
  } catch (error) {
    await pool.end()
    throw error
  }
}
