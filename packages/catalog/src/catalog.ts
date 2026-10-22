import type { ReportQuery, ReportSummary } from '@perdiu/contracts'
import { REPORT_RESULT_LIMIT } from '@perdiu/contracts'
import type { ReportRepository } from './model.js'
import { compareReports, toReportSummary } from './projection.js'

export class ListReports {
  constructor(private readonly repository: ReportRepository) {}

  async execute(query: ReportQuery = {}): Promise<ReportSummary[]> {
    return (await this.repository.list(query))
      .filter((report) => report.state === 'active')
      .sort(compareReports)
      .slice(0, REPORT_RESULT_LIMIT)
      .map(toReportSummary)
  }
}
