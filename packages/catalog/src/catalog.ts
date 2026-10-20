import type { ReportDetail, ReportQuery, ReportSummary } from '@perdiu/contracts'
import { REPORT_RESULT_LIMIT } from '@perdiu/contracts'
import type { ReportRepository } from './model.js'

function microsecondRemainder(timestamp: string) {
  const fraction = timestamp.match(/\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/)?.[1] ?? ''
  return Number(fraction.padEnd(6, '0').slice(3, 6))
}

export class ListReports {
  constructor(private readonly repository: Pick<ReportRepository, 'list'>) {}

  async execute(query: ReportQuery = {}): Promise<ReportSummary[]> {
    return (await this.repository.list(query))
      .filter((report) => report.state === 'active')
      .sort(
        (a, b) =>
          Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
          microsecondRemainder(b.createdAt) - microsecondRemainder(a.createdAt) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      )
      .slice(0, REPORT_RESULT_LIMIT)
      .map((report) => ({
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
      }))
  }
}

export class GetReport {
  constructor(private readonly repository: Pick<ReportRepository, 'find'>) {}

  async execute(id: string, viewerId?: string): Promise<ReportDetail | undefined> {
    const report = await this.repository.find(id)
    if (!report || (report.state !== 'active' && report.ownerId !== viewerId)) return undefined
    return {
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
    }
  }
}
