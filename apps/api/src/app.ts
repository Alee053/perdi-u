import 'reflect-metadata'
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Module,
  Post,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { openDatabase, type Database, type PostgresProfileRepository } from '@perdiu/database'
import { CreateReport, ListReports, ReportValidationError } from '@perdiu/catalog'
import type { AccountIdentity } from '@perdiu/contracts'
import {
  withSessionRevocation,
  type AccessTokenVerifier,
  type AuthenticatedUser,
  type SessionRevocations,
} from './auth/access-token.js'
import { ACCESS_TOKEN_VERIFIER, AuthGuard, CurrentUser } from './auth/guard.js'
import { parseReportQuery } from './reports/query.js'

@Controller('reports')
class ReportsController {
  constructor(
    @Inject(ListReports) private readonly catalog: ListReports,
    @Inject(CreateReport) private readonly publisher: CreateReport,
  ) {}

  @Get()
  async list(@Query() input: Record<string, unknown>) {
    const query = parseReportQuery(input)
    try {
      return await this.catalog.execute(query)
    } catch {
      throw new ServiceUnavailableException('No se pudo cargar el catálogo. Intenta nuevamente.')
    }
  }

  @Post()
  @UseGuards(AuthGuard)
  async publish(@CurrentUser() user: AuthenticatedUser, @Body() input: unknown) {
    try {
      return await this.publisher.execute(user.id, input)
    } catch (error) {
      if (error instanceof ReportValidationError)
        throw new BadRequestException({ fieldErrors: error.errors })
      throw new ServiceUnavailableException('No se pudo publicar el reporte. Intenta nuevamente.')
    }
  }
}

const SESSION_REVOCATIONS = 'SESSION_REVOCATIONS'
const PROFILES = 'PROFILES'

@Controller('me')
@UseGuards(AuthGuard)
class AccountController {
  constructor(
    @Inject(SESSION_REVOCATIONS) private readonly sessions: SessionRevocations,
    @Inject(PROFILES) private readonly profiles: Pick<PostgresProfileRepository, 'find'>,
  ) {}

  /** Private data never cached by the browser, so Back or reload cannot replay it. */
  @Get()
  @Header('Cache-Control', 'no-store')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<AccountIdentity> {
    let profile
    try {
      profile = await this.profiles.find(user.id)
    } catch {
      throw new ServiceUnavailableException('No se pudo cargar tu perfil. Intenta nuevamente.')
    }
    // Explicit allowlist: the profile of the verified subject, never its private contacts.
    return {
      id: user.id,
      email: user.email,
      ...(profile && { displayName: profile.displayName }),
      ...(profile?.photoUrl && { photoUrl: profile.photoUrl }),
    }
  }

  /** Revokes only the verified session of this token; other devices stay signed in. */
  @Post('logout')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async logout(@CurrentUser() user: AuthenticatedUser) {
    try {
      await this.sessions.revoke(user.sessionId)
    } catch {
      throw new ServiceUnavailableException('No se pudo cerrar la sesión. Intenta nuevamente.')
    }
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
          { provide: CreateReport, useValue: new CreateReport(database.publisher) },
          { provide: SESSION_REVOCATIONS, useValue: database.sessions },
          { provide: PROFILES, useValue: database.profiles },
          // Every private route passes the guard, so every one rejects revoked sessions.
          {
            provide: ACCESS_TOKEN_VERIFIER,
            useValue: withSessionRevocation(verifier, database.sessions),
          },
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
