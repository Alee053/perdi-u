import { AuthClient, isAuthApiError, type AuthError } from '@supabase/auth-js'
import { AuthGatewayError, type AuthFailure, type AuthGateway } from './presenter.js'

const reasons: Partial<Record<string, AuthFailure>> = {
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_confirmed',
  weak_password: 'weak_password',
  validation_failed: 'invalid_input',
  email_address_invalid: 'invalid_input',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
}

/** Raw provider errors stay here; the presenter only receives a safe reason. */
function fail(error: AuthError): never {
  const reason = isAuthApiError(error) ? reasons[error.code ?? ''] : undefined
  throw new AuthGatewayError(reason ?? (error.status === 429 ? 'rate_limited' : 'unavailable'))
}

/**
 * Supabase Auth (GoTrue) through the official client. PKCE keeps confirmation links bound to the
 * browser that registered; the client persists and refreshes the session in localStorage.
 */
export function createAuthGateway(
  baseUrl: string,
  location = window.location,
): {
  gateway: AuthGateway
  accessToken: () => Promise<string | undefined>
} {
  const url = new URL(baseUrl.replace(/\/$/, ''), location.origin).href
  const client = new AuthClient({
    url,
    storageKey: 'perdiu-auth',
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  })
  const accessToken = async () => (await client.getSession()).data.session?.access_token

  const gateway: AuthGateway = {
    async restore() {
      const params = new URLSearchParams(location.search)
      const linkFailed = params.has('error') || params.has('error_description')
      const callback = linkFailed || params.has('code')
      await client.initialize()
      if (callback) {
        // Never leave single-use codes or provider errors in the address bar or history.
        for (const key of ['code', 'error', 'error_code', 'error_description']) params.delete(key)
        const search = params.size ? `?${params}` : ''
        window.history.replaceState(null, '', `${location.pathname}${search}${location.hash}`)
      }
      const session = Boolean(await accessToken())
      if (!callback) return { session }
      // A ?code= redirect means Auth already verified the e-mail, even if this browser
      // lacks the PKCE verifier (link opened elsewhere) and cannot finish signing in.
      return { session, link: linkFailed ? 'invalid' : 'confirmed' }
    },
    onSignedOut(listener) {
      const { data } = client.onAuthStateChange((event) => {
        // Deferred: the client must not be awaited inside its own callback.
        if (event === 'SIGNED_OUT') setTimeout(listener, 0)
      })
      return () => data.subscription.unsubscribe()
    },
    async signIn(email, password) {
      const { error } = await client.signInWithPassword({ email, password })
      if (error) fail(error)
    },
    async signUp(email, password) {
      const { data, error } = await client.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/` },
      })
      if (error) fail(error)
      return data.session ? 'signed_in' : 'confirmation_sent'
    },
    async resendConfirmation(email) {
      const { error } = await client.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${location.origin}/` },
      })
      if (error) fail(error)
    },
    async signOut() {
      // The client drops local tokens even when the server is unreachable. Revoke first so a
      // failure keeps the session and is reported instead of announcing a sign-out.
      const token = await accessToken()
      if (token) {
        const response = await fetch(`${url}/logout?scope=local`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => undefined)
        if (!response || (!response.ok && ![401, 403, 404].includes(response.status)))
          throw new AuthGatewayError('unavailable')
      }
      const { error } = await client.signOut({ scope: 'local' })
      if (error) fail(error)
    },
  }
  return { gateway, accessToken }
}
