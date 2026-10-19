import type { AccountIdentity } from '@perdiu/contracts'
import type { Section } from '../types.js'

export type AuthFailure =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'weak_password'
  | 'invalid_input'
  | 'rate_limited'
  | 'unavailable'

/** Auth service failure, reduced to reasons that are safe to explain to the user. */
export class AuthGatewayError extends Error {
  constructor(readonly reason: AuthFailure) {
    super(reason)
  }
}
/** The API rejected the access token (401): the session is not valid for PerdiU. */
export class SessionRejected extends Error {}

export interface AuthGateway {
  /** Restores a stored session or completes a confirmation link; never throws for "no session". */
  restore(): Promise<{ session: boolean; link?: 'confirmed' | 'invalid' }>
  onSignedOut(listener: () => void): () => void
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<'signed_in' | 'confirmation_sent'>
  resendConfirmation(email: string): Promise<void>
  signOut(): Promise<void>
}

export interface AccountClient {
  me(): Promise<AccountIdentity>
  /** Revokes the current session in the API; resolves if it is already invalid there. */
  revokeSession(): Promise<void>
}

export type AuthState =
  | { status: 'restoring' }
  | { status: 'anonymous'; notice?: string }
  | { status: 'authenticated'; user: AccountIdentity }

type Field = 'email' | 'password' | 'confirmPassword'
export type FormResult =
  | { ok: true; confirmationSent?: boolean }
  | { ok: false; fieldErrors: Partial<Record<Field, string>>; message?: string }

const failureMessages: Record<AuthFailure, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Confirma tu correo antes de ingresar. Revisa tu bandeja de entrada.',
  weak_password: 'La contraseña no cumple los requisitos. Usa al menos 8 caracteres.',
  invalid_input: 'Revisa el correo y la contraseña e intenta nuevamente.',
  rate_limited: 'Demasiados intentos. Espera unos minutos e intenta nuevamente.',
  unavailable: 'No se pudo conectar con el servicio de acceso. Intenta nuevamente.',
}
export const signedOutNotice = 'Cerraste sesión correctamente.'
const unverified = 'No se pudo verificar tu sesión. Intenta ingresar nuevamente.'
const expired = 'Tu sesión venció o ya no es válida. Ingresa nuevamente.'
const linkNotices = {
  confirmed: 'Tu correo está confirmado. Inicia sesión para continuar.',
  invalid: 'El enlace no es válido o ya venció. Inicia sesión o vuelve a registrarte.',
}
// Account-owned sections; saved reports remain a per-device list.
const privateSections = new Set<Section>(['publish', 'my-reports'])

const normalizeEmail = (email: string) => email.trim().toLocaleLowerCase('en')
const validEmail = (email: string) =>
  email.length <= 254 && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)

export class AuthPresenter {
  private state: AuthState = { status: 'restoring' }
  private listeners = new Set<() => void>()
  private starting?: Promise<void>
  constructor(
    private readonly gateway: AuthGateway,
    private readonly account: AccountClient,
  ) {}
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private setState(state: AuthState) {
    this.state = state
    this.listeners.forEach((listener) => listener())
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

  async signOut(): Promise<string | undefined> {
    try {
      await this.gateway.signOut()
    } catch {
      return 'No se pudo cerrar la sesión. Intenta nuevamente.'
    }
    this.setState({ status: 'anonymous', notice: signedOutNotice })
    return undefined
  }

  async signIn(input: { email: string; password: string }): Promise<FormResult> {
    const email = normalizeEmail(input.email)
    const fieldErrors: Partial<Record<Field, string>> = {}
    if (!validEmail(email)) fieldErrors.email = 'Ingresa un correo electrónico válido.'
    if (!input.password) fieldErrors.password = 'Ingresa tu contraseña.'
    if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors }
    try {
      await this.gateway.signIn(email, input.password)
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
    const email = normalizeEmail(input.email)
    const fieldErrors: Partial<Record<Field, string>> = {}
    if (!validEmail(email)) fieldErrors.email = 'Ingresa un correo electrónico válido.'
    // Auth enforces the same minimum; bcrypt ignores bytes after the 72nd.
    if ([...input.password].length < 8) fieldErrors.password = 'Usa al menos 8 caracteres.'
    else if (new TextEncoder().encode(input.password).length > 72)
      fieldErrors.password = 'Usa como máximo 72 caracteres.'
    if (input.confirmPassword !== input.password)
      fieldErrors.confirmPassword = 'Las contraseñas no coinciden.'
    if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors }
    let outcome
    try {
      outcome = await this.gateway.signUp(email, input.password)
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
