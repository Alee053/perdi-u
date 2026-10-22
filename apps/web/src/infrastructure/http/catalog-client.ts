import type { ReportCategory, ReportState, ReportSummary, ReportType } from '@perdiu/contracts'
import { SessionRejected } from '../../models/auth/session.js'
import { isWhatsAppNumber } from '../../models/reports/contact.js'
import type {
  ReportDetailRepository,
  ReportsRepository,
} from '../../models/reports/reports-repository.js'

const invalidResponse = () => new Error('La respuesta del catálogo no es válida.')
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0
const category = (value: unknown): value is ReportCategory =>
  value === 'pet' || value === 'object' || value === 'document'
const type = (value: unknown): value is ReportType => value === 'lost' || value === 'found'
const detailStates: readonly unknown[] = ['active', 'resolved'] satisfies ReportState[]

function imageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (/^\/(?!\/)/.test(value)) return !value.includes('\\')
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
  } catch {
    return false
  }
}

/** The catalog only lists active reports; a detail may also be the owner's resolved one. */
function readReport(value: unknown, states: readonly unknown[] = ['active']): ReportSummary {
  if (
    !object(value) ||
    !text(value.id) ||
    !text(value.title) ||
    !text(value.description) ||
    !text(value.city) ||
    !text(value.zone) ||
    !category(value.category) ||
    !type(value.type) ||
    !states.includes(value.state) ||
    !text(value.incidentDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.incidentDate) ||
    !Number.isFinite(Date.parse(value.incidentDate)) ||
    new Date(value.incidentDate).toISOString().slice(0, 10) !== value.incidentDate ||
    !text(value.createdAt) ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    !object(value.author) ||
    !text(value.author.id) ||
    !text(value.author.displayName) ||
    (value.author.photoUrl !== undefined && !imageUrl(value.author.photoUrl)) ||
    !Array.isArray(value.imageUrls)
  )
    throw invalidResponse()
  const imageUrls = value.imageUrls.map((url: unknown) => {
    if (!imageUrl(url)) throw invalidResponse()
    return url
  })
  return {
    id: value.id,
    type: value.type,
    state: value.state as ReportState,
    category: value.category,
    title: value.title,
    description: value.description,
    city: value.city,
    zone: value.zone,
    incidentDate: value.incidentDate,
    createdAt: value.createdAt,
    imageUrls,
    author: {
      id: value.author.id,
      displayName: value.author.displayName,
      ...(value.author.photoUrl ? { photoUrl: value.author.photoUrl } : {}),
    },
  }
}

export function createReportsClient(
  baseUrl = '/api',
  fetcher: typeof fetch = fetch,
): ReportsRepository {
  return {
    async list(signal, query = {}) {
      const params = new URLSearchParams()
      for (const key of ['q', 'type', 'category', 'city'] as const) {
        if (query[key]) params.set(key, query[key])
      }
      const search = params.size ? `?${params}` : ''
      const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/reports${search}`, {
        signal,
        credentials: 'omit',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('No se pudo consultar el catálogo.')
      const data: unknown = await response.json()
      if (!Array.isArray(data)) throw invalidResponse()
      return data.map((item) => readReport(item))
    },
  }
}

/** GET /reports/:id and /reports/:id/contact; the access token is sent only when there is one. */
export function createReportDetailClient(
  baseUrl: string,
  accessToken: () => Promise<string | undefined>,
  fetcher: typeof fetch = fetch,
): ReportDetailRepository {
  const base = baseUrl.replace(/\/$/, '')
  return {
    async find(id, signal) {
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
      // 400 (malformed link) and 404 (missing or not visible) mean the same for the person.
      if (response.status === 400 || response.status === 404) return undefined
      if (!response.ok) throw new Error('No se pudo consultar el reporte.')
      return readReport(await response.json(), detailStates)
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
      if (response.status === 400 || response.status === 404) return undefined
      if (!response.ok) throw new Error('No se pudo consultar el contacto.')
      const data: unknown = await response.json()
      if (object(data) && data.available === false) return { available: false }
      if (object(data) && data.available === true && typeof data.whatsapp === 'string')
        if (isWhatsAppNumber(data.whatsapp)) return { available: true, whatsapp: data.whatsapp }
      throw new Error('La respuesta del contacto no es válida.')
    },
  }
}
