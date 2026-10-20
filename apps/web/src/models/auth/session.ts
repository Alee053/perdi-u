import type { AccountIdentity } from '@perdiu/contracts'

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

/** Port implemented by the Auth provider adapter. */
export interface AuthGateway {
  /** Restores a stored session or completes a confirmation link; never throws for "no session". */
  restore(): Promise<{ session: boolean; link?: 'confirmed' | 'invalid' }>
  onSignedOut(listener: () => void): () => void
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<'signed_in' | 'confirmation_sent'>
  resendConfirmation(email: string): Promise<void>
  signOut(): Promise<void>
}

/** Port implemented by the PerdiU API client: the API is the one that verifies identity. */
export interface AccountClient {
  me(): Promise<AccountIdentity>
  /** Revokes the current session in the API; resolves if it is already invalid there. */
  revokeSession(): Promise<void>
}
