import { DatabaseConfigurationError } from '@perdiu/database/config'
import { createApplication } from './app.js'
import { ConfigurationError, loadEnvironment, readConfig } from './config.js'

try {
  loadEnvironment()
  const config = readConfig(process.env)
  const app = await createApplication(config.databaseUrl)
  try {
    await app.listen(config.port, config.host)
    console.log('API de PerdiU lista.')
  } catch {
    await app.close()
    throw new Error()
  }
} catch (error) {
  console.error(
    error instanceof ConfigurationError || error instanceof DatabaseConfigurationError
      ? error.message
      : 'No se pudo iniciar la API. Revisa la configuración y la disponibilidad de PostgreSQL/puerto.',
  )
  process.exitCode = 1
}
