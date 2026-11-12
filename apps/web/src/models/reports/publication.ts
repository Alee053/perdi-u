import type {
  CreateReportField,
  CreateReportInput,
  ReportValidationErrors,
  ReportValidationIssue,
} from '@perdiu/contracts'

export type ReportDraft = CreateReportInput
export interface ReportPublisher {
  publish(draft: ReportDraft): Promise<void>
}

export interface ReportPhotoFile {
  name: string
  type: string
  size: number
  arrayBuffer(): Promise<ArrayBuffer>
}

export interface ReportMediaClient {
  upload(file: ReportPhotoFile): Promise<string>
  remove(id: string): Promise<void>
}

export class ReportPublishFailure extends Error {
  constructor(
    readonly reason: 'validation' | 'unauthorized' | 'unavailable',
    readonly errors: ReportValidationErrors = {},
  ) {
    super(reason)
  }
}

export type DraftField = CreateReportField
export type DraftIssue = ReportValidationIssue

export function validateDraft(draft: ReportDraft): Partial<Record<DraftField, DraftIssue>> {
  const issues: Partial<Record<DraftField, DraftIssue>> = {}
  const required = (field: DraftField, max: number) => {
    const value = draft[field]
    if (typeof value !== 'string' || !value.trim()) issues[field] = 'required'
    else if (value.trim().length > max) issues[field] = 'too_long'
  }
  required('title', 200)
  required('city', 100)
  required('zone', 200)
  if (!draft.description.trim()) issues.description = 'required'
  else if (draft.description.trim().length < 20) issues.description = 'too_short'
  else if (draft.description.trim().length > 5000) issues.description = 'too_long'
  if (draft.type !== 'lost' && draft.type !== 'found') issues.type = 'invalid'
  if (draft.category !== 'pet' && draft.category !== 'object' && draft.category !== 'document')
    issues.category = 'invalid'
  if (draft.category === 'pet') required('petSpecies', 100)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.incidentDate)) issues.incidentDate = 'invalid'
  else {
    const date = new Date(`${draft.incidentDate}T00:00:00Z`)
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== draft.incidentDate)
      issues.incidentDate = 'invalid'
  }
  const phone = draft.phone.trim().replace(/[\s().-]/g, '')
  if (!phone) issues.phone = 'required'
  else if (!/^\+[1-9]\d{7,14}$/.test(phone)) issues.phone = 'invalid'
  return issues
}

export const photoTypes = ['image/jpeg', 'image/png']
export const maxPhotoBytes = 5 * 1024 * 1024
export const maxPhotoCount = 3

export const isAcceptedPhoto = (file: Pick<ReportPhotoFile, 'type' | 'size'>, currentCount = 0) =>
  currentCount < maxPhotoCount && photoTypes.includes(file.type) && file.size <= maxPhotoBytes
