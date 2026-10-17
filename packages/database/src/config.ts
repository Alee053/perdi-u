export class DatabaseConfigurationError extends Error {}

export function readDatabaseUrl(env: NodeJS.ProcessEnv): string {
  if (!env.DATABASE_URL) throw new DatabaseConfigurationError('DATABASE_URL es obligatoria.')
  try {
    const url = new URL(env.DATABASE_URL)
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      !url.username ||
      url.pathname.length < 2
    )
      throw new Error()
  } catch {
    throw new DatabaseConfigurationError(
      'DATABASE_URL debe ser una URL PostgreSQL válida con usuario y base de datos.',
    )
  }
  return env.DATABASE_URL
}

export function assertLocalDatabase(databaseUrl: string) {
  const url = new URL(readDatabaseUrl({ DATABASE_URL: databaseUrl }))
  // pg query parameters can override the URL's host/database; mutation URLs accept none.
  if (
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    !/^\/perdiu_[a-z0-9_]*(dev|test)$/.test(url.pathname) ||
    url.search ||
    url.hash ||
    process.env.NODE_ENV === 'production'
  ) {
    throw new DatabaseConfigurationError(
      'Esta operación requiere una base PerdiU local terminada en dev o test, fuera de producción.',
    )
  }
}
