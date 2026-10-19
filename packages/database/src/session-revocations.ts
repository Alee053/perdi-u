import type { Pool } from 'pg'

/** Sessions closed through the API; rows outlive restarts so a revoked token stays rejected. */
export class PostgresSessionRevocations {
  constructor(private readonly pool: Pool) {}

  async revoke(sessionId: string) {
    await this.pool.query(
      'INSERT INTO session_revocations (session_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [sessionId],
    )
  }

  async isRevoked(sessionId: string) {
    const result = await this.pool.query(
      'SELECT 1 FROM session_revocations WHERE session_id = $1',
      [sessionId],
    )
    return result.rowCount === 1
  }
}
