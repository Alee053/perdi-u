import { SessionRejected } from '../../models/auth/session.js'
import {
  OwnReportsFailure,
  type OwnReportsRepository,
} from '../../models/reports/own-reports-repository.js'
import { readReport } from './report-response.js'

export function createOwnReportsClient(
  baseUrl: string,
  accessToken: () => Promise<string | undefined>,
  fetcher: typeof fetch = fetch,
): OwnReportsRepository {
  async function request(path: string, signal: AbortSignal, method = 'GET') {
    const token = await accessToken()
    if (!token) throw new SessionRejected()
    const response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method,
      signal,
      credentials: 'omit',
      cache: 'no-store',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
    if (response.status === 401) throw new SessionRejected()
    if (response.status === 403) throw new OwnReportsFailure('forbidden')
    if (response.status === 404) throw new OwnReportsFailure('not_found')
    if (!response.ok) throw new OwnReportsFailure('unavailable')
    return response
  }
  return {
    async list(signal) {
      const data: unknown = await (await request('/me/reports', signal)).json()
      if (!Array.isArray(data)) throw new OwnReportsFailure('unavailable')
      return data.map((value) => readReport(value, true))
    },
    async resolve(id, signal) {
      const response = await request(`/reports/${encodeURIComponent(id)}/resolve`, signal, 'PATCH')
      if (response.status !== 204) throw new OwnReportsFailure('unavailable')
    },
  }
}
