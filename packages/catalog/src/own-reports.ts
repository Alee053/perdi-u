import type { EditReportInput, OwnReportQuery, ReportSummary } from '@perdiu/contracts'
import type { OwnReportsRepository, ResolveReportResult } from './model.js'
import { compareReports, toPublicReport } from './catalog.js'

export class EditReport {
  constructor(private readonly repository: Pick<OwnReportsRepository, 'editOwned'>) {}

  async execute(
    id: string,
    ownerId: string,
    input: EditReportInput,
  ): Promise<ReportSummary | 'forbidden' | 'not_found' | 'resolved'> {
    const result = await this.repository.editOwned(id, ownerId, input)
    return typeof result === 'string' ? result : toPublicReport(result.report)
  }
}

export class ListOwnReports {
  constructor(private readonly repository: Pick<OwnReportsRepository, 'listOwned'>) {}

  async execute(ownerId: string, query: OwnReportQuery = {}): Promise<ReportSummary[]> {
    return (await this.repository.listOwned(ownerId, query))
      .filter(
        (report) => report.ownerId === ownerId && (!query.state || report.state === query.state),
      )
      .sort(compareReports)
      .map(toPublicReport)
  }
}

export class ResolveReport {
  constructor(private readonly repository: Pick<OwnReportsRepository, 'resolveOwned'>) {}

  async execute(id: string, ownerId: string): Promise<ResolveReportResult> {
    return this.repository.resolveOwned(id, ownerId)
  }
}
