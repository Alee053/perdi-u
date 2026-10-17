import 'reflect-metadata'
import { Controller, Get, Inject, Module, Query, ServiceUnavailableException } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { openDatabase, type Database } from '@perdiu/database'
import { ListReports } from '@perdiu/catalog'
import { parseReportQuery } from './reports/query.js'

@Controller('reports')
class ReportsController {
  constructor(@Inject(ListReports) private readonly catalog: ListReports) {}

  @Get()
  async list(@Query() input: Record<string, unknown>) {
    const query = parseReportQuery(input)
    try {
      return await this.catalog.execute(query)
    } catch {
      throw new ServiceUnavailableException('No se pudo cargar el catálogo. Intenta nuevamente.')
    }
  }
}

@Module({})
class AppModule {}

export async function createApplication(databaseUrl: string) {
  let database: Database | undefined
  try {
    database = await openDatabase(databaseUrl)
    const app = await NestFactory.create(
      {
        module: AppModule,
        controllers: [ReportsController],
        providers: [
          { provide: ListReports, useValue: new ListReports(database.reports) },
          { provide: 'DATABASE_LIFECYCLE', useValue: { onModuleDestroy: database.close } },
        ],
      },
      { logger: false, abortOnError: false },
    )
    app.enableShutdownHooks()
    return app
  } catch {
    await database?.close()
    throw new Error('No se pudo conectar o iniciar la API. Revisa PostgreSQL y DATABASE_URL.')
  }
}
