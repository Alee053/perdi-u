import 'reflect-metadata'
import {
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Module,
  NotFoundException,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import {
  openDatabase,
  type Database,
  type PostgresProfileRepository,
  type PostgresReportContactRepository,
} from '@perdiu/database'
import { GetReport, ListReports } from '@perdiu/catalog'
import type { AccountIdentity, ReportContact, ReportDetail } from '@perdiu/contracts'
import {
  withSessionRevocation,
  type AccessTokenVerifier,
  type AuthenticatedUser,
  type SessionRevocations,
} from './auth/access-token.js'
import { ACCESS_TOKEN_VERIFIER, AuthGuard, CurrentUser, OptionalAuthGuard } from './auth/guard.js'
import { parseReportQuery } from './reports/query.js'
import { normalizeBolivianWhatsAppPhone } from './reports/contact.js'

@Controller('reports')
class ReportsController {
  constructor(
    @Inject(ListReports) private readonly catalog: ListReports,
    @Inject(GetReport) private readonly detail: GetReport,
    @Inject('REPORT_CONTACTS')
    private readonly contacts: Pick<PostgresReportContactRepository, 'findPhone'>,
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

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  @Header('Cache-Control', 'no-store')
  async get(
    @Param('id') input: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ReportDetail> {
    const id = reportId(input)
    let report
    try {
      report = await this.detail.execute(id, user?.id)
    } catch {
      throw new ServiceUnavailableException('No se pudo cargar el reporte. Intenta nuevamente.')
    }
    if (!report) throw new NotFoundException('Reporte no disponible.')
    return report
  }

  @Get(':id/contact')
  @UseGuards(AuthGuard)
  @Header('Cache-Control', 'no-store')
  async contact(
    @Param('id') input: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReportContact> {
    const id = reportId(input)
    let report
    try {
      report = await this.detail.execute(id, user.id)
    } catch {
      throw new ServiceUnavailableException('No se pudo cargar el contacto. Intenta nuevamente.')
    }
    if (!report) throw new NotFoundException('Reporte no disponible.')

    let phone
    try {
      phone = await this.contacts.findPhone(id)
    } catch {
      throw new ServiceUnavailableException('No se pudo cargar el contacto. Intenta nuevamente.')
    }
    const normalized = phone && normalizeBolivianWhatsAppPhone(phone)
    if (!normalized) throw new NotFoundException('El contacto no está disponible.')
    return { phone: normalized }
  }
}

function reportId(input: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input))
    throw new BadRequestException('El identificador del reporte no es válido.')
  return input.toLowerCase()
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
          { provide: GetReport, useValue: new GetReport(database.reports) },
          { provide: 'REPORT_CONTACTS', useValue: database.reportContacts },
          { provide: SESSION_REVOCATIONS, useValue: database.sessions },
          { provide: PROFILES, useValue: database.profiles },
          // Every private route passes the guard, so every one rejects revoked sessions.
          {
            provide: ACCESS_TOKEN_VERIFIER,
            useValue: withSessionRevocation(verifier, database.sessions),
          },
          AuthGuard,
          OptionalAuthGuard,
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
