import type { Pool } from 'pg'
import {
  REPORT_RESULT_LIMIT,
  type CreateReportInput,
  type OwnReportQuery,
  type ReportQuery,
} from '@perdiu/contracts'
import type {
  OwnReportsRepository,
  ReportDetailRepository,
  ReportPublisher,
  ReportRecord,
  ReportRepository,
  ResolveReportResult,
} from '@perdiu/catalog'

// Public columns plus the owner ID; contact and storage tables are never joined here.
const reportColumns = `
  r.id, r.owner_id AS "ownerId", r.type, r.state, r.category,
  r.pet_species AS "petSpecies",
  r.title, r.description, r.city, r.zone,
  to_char(r.incident_date, 'YYYY-MM-DD') AS "incidentDate",
  to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdAt",
  jsonb_strip_nulls(jsonb_build_object('id', p.id, 'displayName', p.display_name, 'photoUrl', p.photo_url)) AS author,
  ARRAY(SELECT i.public_url FROM report_images i WHERE i.report_id = r.id ORDER BY i.position) AS "imageUrls"
`

export class PostgresReportRepository
  implements ReportRepository, ReportDetailRepository, ReportPublisher, OwnReportsRepository
{
  constructor(private readonly pool: Pool) {}

  async resolveOwned(id: string, ownerId: string): Promise<ResolveReportResult> {
    // Ownership and active state belong in the write, including concurrent retries.
    const updated = await this.pool.query(
      "UPDATE reports SET state = 'resolved' WHERE id = $1 AND owner_id = $2 AND state = 'active' RETURNING id",
      [id, ownerId],
    )
    if (updated.rowCount) return 'resolved'
    // An authorized repeat returns success without writing the row or its history again.
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
      `SELECT ${reportColumns}
       FROM reports r JOIN profiles p ON p.id = r.owner_id
       WHERE r.owner_id = $1 AND ($2::text IS NULL OR r.state = $2)
       ORDER BY r.created_at DESC, r.id ASC`,
      [ownerId, query.state ?? null],
    )
    return result.rows
  }

  async create(ownerId: string, draft: CreateReportInput): Promise<ReportRecord> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO profiles (id, display_name) VALUES ($1, 'Usuario') ON CONFLICT (id) DO NOTHING`,
        [ownerId],
      )
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO reports
          (owner_id, type, state, category, pet_species, title, description, city, zone, incident_date)
         VALUES ($1, $2, 'active', $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          ownerId,
          draft.type,
          draft.category,
          draft.category === 'pet' ? draft.petSpecies : null,
          draft.title,
          draft.description,
          draft.city,
          draft.zone,
          draft.incidentDate,
        ],
      )
      const id = inserted.rows[0]!.id
      await client.query('INSERT INTO report_contacts (report_id, phone) VALUES ($1, $2)', [
        id,
        draft.phone,
      ])
      const created = await client.query<ReportRecord>(
        `SELECT r.id, r.owner_id AS "ownerId", r.type, r.state, r.category,
          r.pet_species AS "petSpecies", r.title, r.description, r.city, r.zone,
          to_char(r.incident_date, 'YYYY-MM-DD') AS "incidentDate",
          to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdAt",
          jsonb_strip_nulls(jsonb_build_object('id', p.id, 'displayName', p.display_name, 'photoUrl', p.photo_url)) AS author,
          ARRAY(SELECT i.public_url FROM report_images i WHERE i.report_id = r.id ORDER BY i.position) AS "imageUrls"
         FROM reports r JOIN profiles p ON p.id = r.owner_id WHERE r.id = $1`,
        [id],
      )
      await client.query('COMMIT')
      return created.rows[0]!
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async list(query: ReportQuery = {}): Promise<ReportRecord[]> {
    // SQL restricts work; the case of use also enforces catalog invariants for other adapters.
    const result = await this.pool.query<ReportRecord>(
      `
      SELECT ${reportColumns}
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

  /** Any state: the case of use decides who may see a resolved report. */
  async find(id: string): Promise<ReportRecord | undefined> {
    const result = await this.pool.query<ReportRecord>(
      `SELECT ${reportColumns} FROM reports r JOIN profiles p ON p.id = r.owner_id WHERE r.id = $1`,
      [id],
    )
    return result.rows[0]
  }

  /** Private phone of the report; the API asks for it only after checking access. */
  async findContactPhone(reportId: string): Promise<string | undefined> {
    const result = await this.pool.query<{ phone: string | null }>(
      'SELECT phone FROM report_contacts WHERE report_id = $1',
      [reportId],
    )
    return result.rows[0]?.phone ?? undefined
  }
}
