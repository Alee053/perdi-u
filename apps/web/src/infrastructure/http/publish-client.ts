import type {
  CreateReportField,
  CreateReportInput,
  ReportValidationErrors,
} from '@perdiu/contracts'
import { ReportPublishFailure, type ReportPublisher } from '../../models/reports/publication.js'
import { readReport } from './catalog-client.js'

const fields = new Set<CreateReportField>([
  'type',
  'category',
  'title',
  'description',
  'city',
  'zone',
  'incidentDate',
  'phone',
  'petSpecies',
  'mediaIds',
])
const issues = new Set(['required', 'too_short', 'too_long', 'invalid'])

function readFieldErrors(value: unknown): ReportValidationErrors {
  if (typeof value !== 'object' || value === null || !('fieldErrors' in value)) return {}
  const errors = value.fieldErrors
  if (typeof errors !== 'object' || errors === null || Array.isArray(errors)) return {}
  const result: ReportValidationErrors = {}
  for (const [field, issue] of Object.entries(errors))
    if (fields.has(field as CreateReportField) && issues.has(String(issue)))
      result[field as CreateReportField] = issue as ReportValidationErrors[CreateReportField]
  return result
}

/** Authenticated adapter for POST /reports. It sends only the form data and access token. */
export function createReportPublisher(
  baseUrl: string,
  accessToken: () => Promise<string | undefined>,
  fetcher: typeof fetch = fetch,
): ReportPublisher {
  const endpoint = `${baseUrl.replace(/\/$/, '')}/reports`
  return {
    async publish(draft: CreateReportInput) {
      let token: string | undefined
      try {
        token = await accessToken()
      } catch {
        throw new ReportPublishFailure('unavailable')
      }
      if (!token) throw new ReportPublishFailure('unauthorized')

      let response: Response
      try {
        response = await fetcher(endpoint, {
          method: 'POST',
          credentials: 'omit',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(draft),
        })
      } catch {
        throw new ReportPublishFailure('unavailable')
      }
      if (response.status === 401) throw new ReportPublishFailure('unauthorized')
      if (response.status === 400) {
        let errors: ReportValidationErrors = {}
        try {
          errors = readFieldErrors(await response.json())
        } catch {
          // A malformed error body still remains a safe validation failure.
        }
        throw new ReportPublishFailure('validation', errors)
      }
      if (!response.ok) throw new ReportPublishFailure('unavailable')
      try {
        readReport(await response.json())
      } catch {
        throw new ReportPublishFailure('unavailable')
      }
    },
  }
}
