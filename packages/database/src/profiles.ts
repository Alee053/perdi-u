import type { Pool } from 'pg'

export interface ProfileRecord {
  displayName: string
  photoUrl?: string
}

/** Presentation data of a profile; private contact tables are never read here. */
export class PostgresProfileRepository {
  constructor(private readonly pool: Pool) {}

  async find(id: string): Promise<ProfileRecord | undefined> {
    const result = await this.pool.query<{ profile: ProfileRecord }>(
      `SELECT jsonb_strip_nulls(jsonb_build_object('displayName', display_name, 'photoUrl', photo_url)) AS profile
       FROM profiles WHERE id = $1`,
      [id],
    )
    return result.rows[0]?.profile
  }
}
