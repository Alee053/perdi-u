import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  createParamDecorator,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common'
import {
  AuthUnavailable,
  InvalidAccessToken,
  type AccessTokenVerifier,
  type AuthenticatedUser,
} from './access-token.js'

export const ACCESS_TOKEN_VERIFIER = 'ACCESS_TOKEN_VERIFIER'

interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>
  user?: AuthenticatedUser
}

/** Private routes accept only a verified bearer token; nothing from the body or query. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(ACCESS_TOKEN_VERIFIER) private readonly verifier: AccessTokenVerifier) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const response = context.switchToHttp().getResponse<{ setHeader(n: string, v: string): void }>()
    const unauthorized = () => {
      response.setHeader('WWW-Authenticate', 'Bearer')
      return new UnauthorizedException('Inicia sesión para continuar.')
    }
    const header = request.headers.authorization
    const token = typeof header === 'string' ? /^Bearer ([^\s]+)$/.exec(header)?.[1] : undefined
    if (!token) throw unauthorized()
    try {
      request.user = await this.verifier.verify(token)
      return true
    } catch (error) {
      if (error instanceof InvalidAccessToken) throw unauthorized()
      if (!(error instanceof AuthUnavailable)) console.error('No se pudo verificar una sesión.')
      throw new ServiceUnavailableException('No se pudo verificar la sesión. Intenta nuevamente.')
    }
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user!,
)
