import type { Pool } from 'pg'
import { REPORT_RESULT_LIMIT, type ReportQuery } from '@perdiu/contracts'
import type { ReportRecord, ReportRepository } from '@perdiu/catalog'

export class PostgresReportRepository implements ReportRepository {
  constructor(private readonly pool: Pool) {}

  async list(query: ReportQuery = {}): Promise<ReportRecord[]> {
    // SQL restricts work; the case of use also enforces catalog invariants for other adapters.
    const result = await this.pool.query<ReportRecord>(
      `
      SELECT r.id, r.owner_id AS "ownerId", r.type, r.state, r.category,
        r.title, r.description, r.city, r.zone,
        to_char(r.incident_date, 'YYYY-MM-DD') AS "incidentDate",
        to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdAt",
        jsonb_strip_nulls(jsonb_build_object('id', p.id, 'displayName', p.display_name, 'photoUrl', p.photo_url)) AS author,
        ARRAY(SELECT i.public_url FROM report_images i WHERE i.report_id = r.id ORDER BY i.position) AS "imageUrls"
      FROM reports r JOIN profiles p ON p.id = r.owner_id
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
