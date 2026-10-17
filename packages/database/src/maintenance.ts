import { readFile, readdir } from 'node:fs/promises'
import type { Pool } from 'pg'

export async function migrate(pool: Pool, directory = new URL('../migrations/', import.meta.url)) {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql'))
  const migrations = files
    .map((file) => {
      const match = /^(\d{3,})_[a-z0-9_]+\.sql$/.exec(file)
      const version = Number(match?.[1])
      if (!match || !Number.isSafeInteger(version) || version < 1 || version > 2147483647)
        throw new Error('Nombre de migración inválido.')
      return { file, version }
    })
    .sort((a, b) => a.version - b.version)
  if (!migrations.length) throw new Error('No se encontraron migraciones SQL.')
  if (new Set(migrations.map(({ version }) => version)).size !== migrations.length)
    throw new Error('Hay versiones de migración duplicadas.')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['perdiu_migrations'])
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
    )
    const applied = await client.query<{ version: number }>('SELECT version FROM schema_migrations')
    const versions = new Set(applied.rows.map(({ version }) => version))
    if (
      applied.rows.some(
        ({ version }) => !migrations.some((migration) => migration.version === version),
      )
    ) {
      throw new Error('Falta un archivo de una migración aplicada.')
    }
    for (const { file, version } of migrations) {
      if (versions.has(version)) continue
      await client.query(await readFile(new URL(file, directory), 'utf8'))
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version])
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function seed(pool: Pool) {
  const sql = await readFile(new URL('../seeds/development.sql', import.meta.url), 'utf8')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['perdiu_seed'])
    await client.query(sql)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
