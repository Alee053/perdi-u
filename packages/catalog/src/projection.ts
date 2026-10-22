import type { ReportSummary } from '@perdiu/contracts'
import type { ReportRecord } from './model.js'

function microsecondRemainder(timestamp: string) {
  const fraction = timestamp.match(/\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/)?.[1] ?? ''
  return Number(fraction.padEnd(6, '0').slice(3, 6))
}

export const compareReports = (a: ReportRecord, b: ReportRecord) =>
  Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
  microsecondRemainder(b.createdAt) - microsecondRemainder(a.createdAt) ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

export const toReportSummary = (report: ReportRecord): ReportSummary => ({
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
