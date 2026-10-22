import type { ReportSummary } from '@perdiu/contracts'
import type { ReportRecord } from './model.js'

/** Explicit public allowlist: owner, contact and storage data never leave through it. */
export const toPublicReport = (report: ReportRecord): ReportSummary => ({
  id: report.id,
  title: report.title,
  description: report.description,
  type: report.type,
  state: report.state,
  category: report.category,
  city: report.city,
  zone: report.zone,
  incidentDate: report.incidentDate,
  createdAt: report.createdAt,
  author: {
    id: report.author.id,
    displayName: report.author.displayName,
    ...(report.author.photoUrl ? { photoUrl: report.author.photoUrl } : {}),
  },
  imageUrls: [...report.imageUrls],
})
