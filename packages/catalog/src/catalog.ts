import type { ReportQuery, ReportSummary } from '@perdiu/contracts'
import { REPORT_RESULT_LIMIT } from '@perdiu/contracts'
import type { ReportRepository } from './model.js'
import { toPublicReport } from './projection.js'

function microsecondRemainder(timestamp: string) {
  const fraction = timestamp.match(/\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/)?.[1] ?? ''
  return Number(fraction.padEnd(6, '0').slice(3, 6))
}

export class ListReports {
  constructor(private readonly repository: ReportRepository) {}

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
      .map(toPublicReport)
  }
}
