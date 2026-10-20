import type { ReportContact, ReportDetail } from '@perdiu/contracts'
import { SessionRejected } from '../auth/presenter.js'
import { readReportDetail } from '../catalog/client.js'

export class ReportUnavailable extends Error {}
export class ContactUnavailable extends Error {}

export interface ReportDetailClient {
  get(id: string, signal: AbortSignal): Promise<ReportDetail>
  contact(id: string): Promise<ReportContact>
}

const invalidContact = () => new ContactUnavailable('El contacto no está disponible.')

export function createReportDetailClient(
  baseUrl = '/api',
  accessToken: () => Promise<string | undefined> = async () => undefined,
  fetcher: typeof fetch = fetch,
): ReportDetailClient {
  const base = baseUrl.replace(/\/$/, '')
  return {
    async get(id, signal) {
      const token = await accessToken()
      const response = await fetcher(`${base}/reports/${encodeURIComponent(id)}`, {
        signal,
        credentials: 'omit',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (response.status === 404 || response.status === 400) throw new ReportUnavailable()
      if (!response.ok) throw new Error('No se pudo cargar el reporte.')
      return readReportDetail(await response.json())
    },
    async contact(id) {
      const token = await accessToken()
      if (!token) throw new SessionRejected()
      const response = await fetcher(`${base}/reports/${encodeURIComponent(id)}/contact`, {
        credentials: 'omit',
        cache: 'no-store',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      if (response.status === 401) throw new SessionRejected()
      if (response.status === 404) throw invalidContact()
      if (!response.ok) throw new Error('No se pudo cargar el contacto.')
      const data: unknown = await response.json()
      if (
        typeof data !== 'object' ||
        data === null ||
        !('phone' in data) ||
        typeof data.phone !== 'string' ||
        !/^591[67]\d{7}$/.test(data.phone)
      )
        throw invalidContact()
      return { phone: data.phone }
    },
  }
}
