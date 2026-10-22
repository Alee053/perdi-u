import type { Pool } from 'pg'
import type { ReportState } from '@perdiu/contracts'
import { MediaLimitError, type ReportMediaMetadataRepository } from '@perdiu/catalog'

export class PostgresMediaRepository implements ReportMediaMetadataRepository {
  constructor(private readonly pool: Pool) {}

  async create(
    ownerId: string,
    id: string,
    storageKey: string,
    contentType: 'image/jpeg' | 'image/png',
    size: number,
  ) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO profiles (id, display_name) VALUES ($1, 'Usuario') ON CONFLICT (id) DO NOTHING`,
        [ownerId],
      )
      await client.query('SELECT id FROM profiles WHERE id = $1 FOR UPDATE', [ownerId])
      const pending = await client.query<{ count: string }>(
        `SELECT count(*) FROM report_media
         WHERE owner_id = $1 AND report_id IS NULL AND status = 'available'`,
        [ownerId],
      )
      if (Number(pending.rows[0]?.count ?? 0) >= 3) throw new MediaLimitError()
      await client.query(
        `INSERT INTO report_media (id, owner_id, storage_key, content_type, size_bytes)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, ownerId, storageKey, contentType, size],
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async beginDelete(ownerId: string, id: string) {
    const result = await this.pool.query<{ storageKey: string }>(
      `UPDATE report_media SET status = 'deleting'
       WHERE id = $1 AND owner_id = $2 AND report_id IS NULL AND status IN ('available', 'deleting')
       RETURNING storage_key AS "storageKey"`,
      [id, ownerId],
    )
    return result.rows[0]?.storageKey
  }

  async completeDelete(id: string) {
    await this.pool.query(`DELETE FROM report_media WHERE id = $1 AND status = 'deleting'`, [id])
  }

  async findAttached(id: string) {
    const result = await this.pool.query<{
      storageKey: string
      contentType: 'image/jpeg' | 'image/png'
      ownerId: string
      state: ReportState
    }>(
      `SELECT m.storage_key AS "storageKey", m.content_type AS "contentType",
              r.owner_id AS "ownerId", r.state
       FROM report_media m JOIN reports r ON r.id = m.report_id
       WHERE m.id = $1 AND m.status = 'available'`,
      [id],
    )
    return result.rows[0]
  }
}
