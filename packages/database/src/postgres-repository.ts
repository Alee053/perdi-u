import type { Pool } from 'pg'
import { REPORT_RESULT_LIMIT, type OwnReportQuery, type ReportQuery } from '@perdiu/contracts'
import type {
  OwnReportsRepository,
  ReportRecord,
  ReportRepository,
  ResolveReportResult,
} from '@perdiu/catalog'

const reportSelect = `SELECT r.id, r.owner_id AS "ownerId", r.type, r.state, r.category,
        r.title, r.description, r.city, r.zone,
        to_char(r.incident_date, 'YYYY-MM-DD') AS "incidentDate",
        to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdAt",
        jsonb_strip_nulls(jsonb_build_object('id', p.id, 'displayName', p.display_name, 'photoUrl', p.photo_url)) AS author,
        ARRAY(SELECT i.public_url FROM report_images i WHERE i.report_id = r.id ORDER BY i.position) AS "imageUrls"
      FROM reports r JOIN profiles p ON p.id = r.owner_id`

export class PostgresReportRepository implements ReportRepository, OwnReportsRepository {
  constructor(private readonly pool: Pool) {}

  async resolveOwned(id: string, ownerId: string): Promise<ResolveReportResult> {
    // Both predicates are part of the write: concurrent retries can change the row only once.
    const updated = await this.pool.query(
      "UPDATE reports SET state = 'resolved' WHERE id = $1 AND owner_id = $2 AND state = 'active' RETURNING id",
      [id, ownerId],
    )
    if (updated.rowCount) return 'resolved'
    // A repeat by the owner succeeds without writing; other owners still receive forbidden.
    const existing = await this.pool.query<{ ownerId: string }>(
      'SELECT owner_id AS "ownerId" FROM reports WHERE id = $1',
      [id],
    )
    const report = existing.rows[0]
    if (!report) return 'not_found'
    return report.ownerId === ownerId ? 'resolved' : 'forbidden'
  }

  async listOwned(ownerId: string, query: OwnReportQuery = {}): Promise<ReportRecord[]> {
    const result = await this.pool.query<ReportRecord>(
      `${reportSelect}
       WHERE r.owner_id = $1 AND ($2::text IS NULL OR r.state = $2)
       ORDER BY r.created_at DESC, r.id ASC`,
      [ownerId, query.state ?? null],
    )
    return result.rows
  }

  async list(query: ReportQuery = {}): Promise<ReportRecord[]> {
    // SQL restricts work; the case of use also enforces catalog invariants for other adapters.
    const result = await this.pool.query<ReportRecord>(
      `
      ${reportSelect}
      WHERE r.state = $1
        AND ($2 = '' OR
          position($2 in lower(regexp_replace(normalize(r.title, NFD), '[\u0300-\u036f]', '', 'g'))) > 0 OR
          position($2 in lower(regexp_replace(normalize(r.description, NFD), '[\u0300-\u036f]', '', 'g'))) > 0)
        AND ($3::text IS NULL OR r.type = $3)
        AND ($4::text IS NULL OR r.category = $4)
        AND ($5::text IS NULL OR r.city = $5)
      ORDER BY r.created_at DESC, r.id ASC
      LIMIT $6
    `,
      [
        'active',
        (query.q ?? '')
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase('es'),
        query.type ?? null,
        query.category ?? null,
        query.city ?? null,
        REPORT_RESULT_LIMIT,
      ],
    )
    return result.rows
  }
}
