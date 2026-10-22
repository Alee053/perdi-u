import type { AccountIdentity } from '@perdiu/contracts'
import {
  normalizeEmail,
  validateSignIn,
  validateSignUp,
  type CredentialField,
  type CredentialIssue,
  type CredentialIssues,
} from '../../models/auth/credentials.js'
import {
  AuthGatewayError,
  SessionRejected,
  type AccountClient,
  type AuthFailure,
  type AuthGateway,
} from '../../models/auth/session.js'
import { privateSections, type Section } from '../app/sections.js'
import { Store } from '../store.js'

export type AuthState =
  | { status: 'restoring' }
  | { status: 'anonymous'; notice?: string }
  | { status: 'authenticated'; user: AccountIdentity }

export type FieldErrors = Partial<Record<CredentialField, string>>
export type FormResult =
  | { ok: true; confirmationSent?: boolean }
  | { ok: false; fieldErrors: FieldErrors; message?: string }

const failureMessages: Record<AuthFailure, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Confirma tu correo antes de ingresar. Revisa tu bandeja de entrada.',
  weak_password: 'La contraseña no cumple los requisitos. Usa al menos 8 caracteres.',
  invalid_input: 'Revisa el correo y la contraseña e intenta nuevamente.',
  rate_limited: 'Demasiados intentos. Espera unos minutos e intenta nuevamente.',
  unavailable: 'No se pudo conectar con el servicio de acceso. Intenta nuevamente.',
}
const issueMessages: Record<CredentialField, Partial<Record<CredentialIssue, string>>> = {
  email: { invalid: 'Ingresa un correo electrónico válido.' },
  password: {
    required: 'Ingresa tu contraseña.',
    too_short: 'Usa al menos 8 caracteres.',
    too_long: 'Usa como máximo 72 caracteres.',
  },
  confirmPassword: { mismatch: 'Las contraseñas no coinciden.' },
}

export const signedOutNotice = 'Cerraste sesión correctamente.'
const unverified = 'No se pudo verificar tu sesión. Intenta ingresar nuevamente.'
const expired = 'Tu sesión venció o ya no es válida. Ingresa nuevamente.'
const linkNotices = {
  confirmed: 'Tu correo está confirmado. Inicia sesión para continuar.',
  invalid: 'El enlace no es válido o ya venció. Inicia sesión o vuelve a registrarte.',
}

function fieldErrors(issues: CredentialIssues): FieldErrors {
  const errors: FieldErrors = {}
  for (const [field, issue] of Object.entries(issues) as [CredentialField, CredentialIssue][])
    errors[field] = issueMessages[field][issue]
  return errors
}

/** Session presenter: the credential rules live in the model, the provider behind `AuthGateway`. */
export class AuthPresenter extends Store<AuthState> {
  private starting?: Promise<void>
  constructor(
    private readonly gateway: AuthGateway,
    private readonly account: AccountClient,
  ) {
    super({ status: 'restoring' })
  }

  /** Idempotent: React StrictMode may run the effect twice. */
  start() {
    this.starting ??= this.restore()
    return this.starting
  }

  private async restore() {
    this.gateway.onSignedOut(() => {
      // Expired refresh token, revoked session or sign-out in another tab.
      if (this.state.status === 'authenticated')
        this.setState({ status: 'anonymous', notice: expired })
    })
    const { session, link } = await this.gateway.restore()
    if (!session)
      return this.setState({
        status: 'anonymous',
        ...(link ? { notice: linkNotices[link] } : {}),
      })
    await this.verify()
  }

  /** A session counts only after the API has verified its token. */
  private async verify(): Promise<string | undefined> {
    try {
      this.setState({ status: 'authenticated', user: await this.account.me() })
      return undefined
    } catch (error) {
      if (!(error instanceof SessionRejected)) {
        this.setState({ status: 'anonymous', notice: unverified })
        return unverified
      }
      // Drop the stored session first so a reload cannot restore the rejected token.
      await this.gateway.signOut().catch(() => undefined)
      this.setState({ status: 'anonymous', notice: expired })
      return expired
    }
  }

  access(section: Section): 'allow' | 'login' | 'wait' {
    if (!privateSections.has(section) || this.state.status === 'authenticated') return 'allow'
    return this.state.status === 'restoring' ? 'wait' : 'login'
  }

  /** A private request rejected the session; hide private data and require verification again. */
  requireSignIn = () => this.setState({ status: 'anonymous', notice: expired })

  /**
   * Revokes the session in the API before closing it in Auth: discarding the JWT in the browser
   * does not invalidate it. A retry after a partial failure succeeds because the API answers 401.
   */
  async signOut(): Promise<string | undefined> {
    try {
      await this.account.revokeSession()
      await this.gateway.signOut()
    } catch {
      return 'No se pudo cerrar la sesión. Intenta nuevamente.'
    }
    this.setState({ status: 'anonymous', notice: signedOutNotice })
    return undefined
  }

  async signIn(input: { email: string; password: string }): Promise<FormResult> {
    const issues = validateSignIn(input)
    if (Object.keys(issues).length) return { ok: false, fieldErrors: fieldErrors(issues) }
    try {
      await this.gateway.signIn(normalizeEmail(input.email), input.password)
    } catch (error) {
      return { ok: false, fieldErrors: {}, message: this.failure(error) }
    }
    const message = await this.verify()
    return message ? { ok: false, fieldErrors: {}, message } : { ok: true }
  }

  async signUp(input: {
    email: string
    password: string
    confirmPassword: string
  }): Promise<FormResult> {
    const issues = validateSignUp(input)
    if (Object.keys(issues).length) return { ok: false, fieldErrors: fieldErrors(issues) }
    let outcome
    try {
      outcome = await this.gateway.signUp(normalizeEmail(input.email), input.password)
    } catch (error) {
      return { ok: false, fieldErrors: {}, message: this.failure(error) }
    }
    // Auth answers the same way for new and existing e-mails; nothing reveals which one it was.
    if (outcome === 'confirmation_sent') return { ok: true, confirmationSent: true }
    const message = await this.verify()
    return message ? { ok: false, fieldErrors: {}, message } : { ok: true }
  }

  async resendConfirmation(email: string) {
    try {
      await this.gateway.resendConfirmation(normalizeEmail(email))
      return undefined
    } catch (error) {
      return this.failure(error)
    }
  }

  private failure(error: unknown) {
    return failureMessages[error instanceof AuthGatewayError ? error.reason : 'unavailable']
  }
}
