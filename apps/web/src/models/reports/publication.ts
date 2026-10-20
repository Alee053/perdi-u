import type { PublicProfile, ReportCategory, ReportType } from '@perdiu/contracts'
import { isOwnedBy, type DemoReport, type Report } from './report.js'

export interface ReportDraft {
  type: ReportType
  category: ReportCategory
  title: string
  description: string
  city: string
  zone: string
  /** `YYYY-MM-DD`; empty when the person does not know it. */
  incidentDate: string
  imageUrl?: string
}

export type DraftField = 'title' | 'description' | 'zone'
export type DraftIssue = 'required' | 'too_short'
export const draftMinimums = { title: 3, description: 20 }

export function validateDraft(draft: ReportDraft): Partial<Record<DraftField, DraftIssue>> {
  const issues: Partial<Record<DraftField, DraftIssue>> = {}
  const title = draft.title.trim()
  const description = draft.description.trim()
  if (!title) issues.title = 'required'
  else if (title.length < draftMinimums.title) issues.title = 'too_short'
  if (!description) issues.description = 'required'
  else if (description.length < draftMinimums.description) issues.description = 'too_short'
  if (!draft.zone.trim()) issues.zone = 'required'
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
  draft: ReportDraft,
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
