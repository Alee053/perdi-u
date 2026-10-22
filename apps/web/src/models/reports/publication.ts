import type {
  CreateReportField,
  CreateReportInput,
  PublicProfile,
  ReportCategory,
  ReportType,
  ReportValidationErrors,
  ReportValidationIssue,
} from '@perdiu/contracts'
import { isOwnedBy, type DemoReport, type Report } from './report.js'

export type ReportDraft = CreateReportInput
export interface ReportPublisher {
  publish(draft: ReportDraft): Promise<void>
}

export class ReportPublishFailure extends Error {
  constructor(
    readonly reason: 'validation' | 'unauthorized' | 'unavailable',
    readonly errors: ReportValidationErrors = {},
  ) {
    super(reason)
  }
}

export interface DemoReportDraft {
  type: ReportType
  category: ReportCategory
  title: string
  description: string
  city: string
  zone: string
  incidentDate: string
  imageUrl?: string
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

export const isAcceptedPhoto = (file: { type: string; size: number }) =>
  photoTypes.includes(file.type) && file.size <= maxPhotoBytes

/** Calendar day in Bolivia, which is the day the person sees when publishing. */
const localDay = (now: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(now)

export function publishDemoReport(
  draft: DemoReportDraft,
  context: { id: string; now: Date; owner: PublicProfile & { phone: string } },
): DemoReport {
  const { owner } = context
  return {
    id: context.id,
    source: 'demo',
    type: draft.type,
    state: 'active',
    category: draft.category,
    title: draft.title.trim(),
    description: draft.description.trim(),
    city: draft.city,
    zone: draft.zone.trim(),
    incidentDate: draft.incidentDate || localDay(context.now),
    createdAt: context.now.toISOString(),
    imageUrls: draft.imageUrl ? [draft.imageUrl] : [],
    // The public author never carries the contact phone.
    author: { id: owner.id, displayName: owner.displayName },
    phone: owner.phone,
    position: { top: '48%', left: '48%' },
  }
}

/** Changes apply only to reports owned by `ownerId`; otherwise the same list is returned. */
export function resolveReport(reports: Report[], id: string, ownerId: string) {
  const target = reports.find((report) => report.id === id)
  if (!target || !isOwnedBy(target, ownerId)) return reports
  return reports.map((report) =>
    report === target ? { ...report, state: 'resolved' as const } : report,
  )
}

export function removeReport(reports: Report[], id: string, ownerId: string) {
  const target = reports.find((report) => report.id === id)
  if (!target || !isOwnedBy(target, ownerId)) return reports
  return reports.filter((report) => report !== target)
}
