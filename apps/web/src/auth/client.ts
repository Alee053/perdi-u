import type { AccountIdentity } from '@perdiu/contracts'
import { SessionRejected, type AccountClient } from './presenter.js'

/** GET /me with the current access token; only the private identity fields are kept. */
export function createAccountClient(
  baseUrl: string,
  accessToken: () => Promise<string | undefined>,
  fetcher: typeof fetch = fetch,
): AccountClient {
  return {
    async me(): Promise<AccountIdentity> {
      const token = await accessToken()
      if (!token) throw new SessionRejected()
      const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/me`, {
        credentials: 'omit',
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
      return { id: data.id, email: data.email }
    },
  }
}
