import type { Pool } from 'pg'

/** Reads a report's private contact only after the API has checked report access. */
export class PostgresReportContactRepository {
  constructor(private readonly pool: Pool) {}

  async findPhone(reportId: string): Promise<string | undefined> {
    const result = await this.pool.query<{ phone: string | null }>(
      'SELECT phone FROM report_contacts WHERE report_id = $1',
      [reportId],
    )
    return result.rows[0]?.phone ?? undefined
  }
}
