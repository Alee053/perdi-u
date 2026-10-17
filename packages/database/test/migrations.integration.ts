import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { test } from '@jest/globals'
import { Pool } from 'pg'
import { assertLocalDatabase } from '../src/config.js'
import { createPool } from '../src/pool.js'
import { migrate } from '../src/maintenance.js'

test('migraciones descubiertas se aplican en orden, una sola vez y con rollback de fallos', async () => {
  assert.equal(
    process.env.PERDIU_TEST_CONTAINER,
    '1',
    'Usa pnpm test:integration con PostgreSQL aislado.',
  )
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  assertLocalDatabase(databaseUrl)
  const setup = createPool(databaseUrl)
  const directory = await mkdtemp(join(tmpdir(), 'perdiu-migrations-'))
  const source = pathToFileURL(directory + '/')
  let pool: Pool | undefined
  try {
    await setup.query('CREATE SCHEMA migration_checks')
    pool = new Pool({ connectionString: databaseUrl, options: '-c search_path=migration_checks' })
    await writeFile(join(directory, '002_second.sql'), "INSERT INTO steps VALUES ('second');")
    await writeFile(
      join(directory, '001_first.sql'),
      "CREATE TABLE steps (name text); INSERT INTO steps VALUES ('first');",
    )
    await migrate(pool, source)
    assert.deepEqual((await pool.query('SELECT name FROM steps ORDER BY name')).rows, [
      { name: 'first' },
      { name: 'second' },
    ])
    await migrate(pool, source)
    assert.equal((await pool.query('SELECT * FROM steps')).rowCount, 2)
    await writeFile(join(directory, '003_third.sql'), "INSERT INTO steps VALUES ('third');")
    await migrate(pool, source)
    assert.deepEqual(
      (await pool.query('SELECT version FROM schema_migrations ORDER BY version')).rows,
      [{ version: 1 }, { version: 2 }, { version: 3 }],
    )
    await writeFile(
      join(directory, '004_failure.sql'),
      "INSERT INTO steps VALUES ('rollback'); SELECT * FROM missing_migration_table;",
    )
    await assert.rejects(migrate(pool, source))
    assert.equal((await pool.query('SELECT * FROM steps')).rowCount, 3)
    assert.equal((await pool.query('SELECT * FROM schema_migrations')).rowCount, 3)
    await writeFile(join(directory, '004_failure.sql'), "INSERT INTO steps VALUES ('fourth');")
    await migrate(pool, source)
    assert.equal((await pool.query('SELECT * FROM steps')).rowCount, 4)
    await writeFile(join(directory, '004_duplicate.sql'), 'SELECT 1;')
    await assert.rejects(migrate(pool, source), /versiones de migración duplicadas/i)
    await rm(join(directory, '004_duplicate.sql'))
    await writeFile(join(directory, 'invalid.sql'), 'SELECT 1;')
    await assert.rejects(migrate(pool, source), /nombre de migración inválido/i)
    await rm(join(directory, 'invalid.sql'))
    await rm(join(directory, '003_third.sql'))
    await assert.rejects(migrate(pool, source), /falta un archivo/i)
  } finally {
    await pool?.end()
    await setup.query('DROP SCHEMA IF EXISTS migration_checks CASCADE')
    await setup.end()
    await rm(directory, { recursive: true, force: true })
  }
})
