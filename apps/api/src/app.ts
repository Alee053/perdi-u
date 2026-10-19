import 'reflect-metadata'
import {
  Controller,
  Get,
  Inject,
  Module,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { openDatabase, type Database } from '@perdiu/database'
import { ListReports } from '@perdiu/catalog'
import type { AccountIdentity } from '@perdiu/contracts'
import type { AccessTokenVerifier, AuthenticatedUser } from './auth/access-token.js'
import { ACCESS_TOKEN_VERIFIER, AuthGuard, CurrentUser } from './auth/guard.js'
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

@Controller('me')
@UseGuards(AuthGuard)
class AccountController {
  @Get()
  me(@CurrentUser() user: AuthenticatedUser): AccountIdentity {
    return { id: user.id, email: user.email }
  }
}

@Module({})
class AppModule {}

export async function createApplication(databaseUrl: string, verifier: AccessTokenVerifier) {
  let database: Database | undefined
  try {
    database = await openDatabase(databaseUrl)
    const app = await NestFactory.create(
      {
        module: AppModule,
        controllers: [ReportsController, AccountController],
        providers: [
          { provide: ListReports, useValue: new ListReports(database.reports) },
          { provide: ACCESS_TOKEN_VERIFIER, useValue: verifier },
          AuthGuard,
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
