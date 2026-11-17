import type { EditReportInput, ReportValidationIssue } from '@perdiu/contracts'
import { SessionRejected } from '../../models/auth/session.js'
import {
  OwnReportsFailure,
  type OwnReportEditErrors,
  type OwnReportsRepository,
} from '../../models/reports/own-reports-repository.js'
import { readReport } from './catalog-client.js'

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function createOwnReportsClient(
  baseUrl: string,
  accessToken: () => Promise<string | undefined>,
  fetcher: typeof fetch = fetch,
): OwnReportsRepository {
  async function request(path: string, signal: AbortSignal, method = 'GET', body?: unknown) {
    const token = await accessToken()
    if (!token) throw new SessionRejected()
    const response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method,
      signal,
      credentials: 'omit',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })
    if (response.status === 401) throw new SessionRejected()
    if (response.status === 403) throw new OwnReportsFailure('forbidden')
    if (response.status === 404) throw new OwnReportsFailure('not_found')
    if (response.status === 409) throw new OwnReportsFailure('conflict')
    if (response.status === 400) {
      const value: unknown = await response.json().catch(() => null)
      const fieldErrors: OwnReportEditErrors = {}
      if (object(value) && object(value.fieldErrors))
        for (const [field, issue] of Object.entries(value.fieldErrors))
          if (
            [
              'type',
              'category',
              'incidentDate',
              'petSpecies',
              'title',
              'description',
              'city',
              'zone',
            ].includes(field) &&
            ['required', 'too_short', 'too_long', 'invalid'].includes(String(issue))
          )
            fieldErrors[field as keyof EditReportInput] = issue as ReportValidationIssue
      throw new OwnReportsFailure('validation', fieldErrors)
    }
    if (!response.ok) throw new OwnReportsFailure('unavailable')
    return response
  }
  return {
    async list(signal) {
      const data: unknown = await (await request('/me/reports', signal)).json()
      if (!Array.isArray(data)) throw new OwnReportsFailure('unavailable')
      return data.map((value) => readReport(value, ['active', 'resolved']))
    },
    async resolve(id, signal) {
      const response = await request(`/reports/${encodeURIComponent(id)}/resolve`, signal, 'PATCH')
      if (response.status !== 204) throw new OwnReportsFailure('unavailable')
    },
    async edit(id, patch: EditReportInput, signal) {
      const response = await request(`/reports/${encodeURIComponent(id)}`, signal, 'PATCH', patch)
      return readReport(await response.json(), ['active', 'resolved'])
    },
  }
}
