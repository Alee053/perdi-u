import type { AccountIdentity } from '@perdiu/contracts'
import { SessionRejected, type AccountClient } from '../../models/auth/session.js'

/** GET /me with the current access token; only the private identity fields are kept. */
export function createAccountClient(
  baseUrl: string,
  accessToken: () => Promise<string | undefined>,
  fetcher: typeof fetch = fetch,
): AccountClient {
  const base = baseUrl.replace(/\/$/, '')
  return {
    async me(): Promise<AccountIdentity> {
      const token = await accessToken()
      if (!token) throw new SessionRejected()
      const response = await fetcher(`${base}/me`, {
        credentials: 'omit',
        cache: 'no-store',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      if (response.status === 401) throw new SessionRejected()
      if (!response.ok) throw new Error('No se pudo verificar la sesión.')
      const data: unknown = await response.json()
      if (
        typeof data !== 'object' ||
        data === null ||
        !('id' in data) ||
        !('email' in data) ||
        typeof data.id !== 'string' ||
        typeof data.email !== 'string' ||
        !data.id ||
        !data.email
      )
        throw new Error('La respuesta de la cuenta no es válida.')
      const text = (key: 'displayName' | 'photoUrl') => {
        const value = (data as Record<string, unknown>)[key]
        return typeof value === 'string' && value ? { [key]: value } : {}
      }
      return { id: data.id, email: data.email, ...text('displayName'), ...text('photoUrl') }
    },
    async revokeSession() {
      const token = await accessToken()
      if (!token) return
      const response = await fetcher(`${base}/me/logout`, {
        method: 'POST',
        credentials: 'omit',
        headers: { Authorization: `Bearer ${token}` },
      })
      // 401: the API already rejects this token (revoked or expired), so nothing remains open.
      if (!response.ok && response.status !== 401) throw new Error('No se pudo cerrar la sesión.')
    },
  }
}
