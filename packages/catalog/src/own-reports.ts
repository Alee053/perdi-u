import type {
  EditReportInput,
  OwnReportQuery,
  ReportSummary,
  ReportValidationIssue,
} from '@perdiu/contracts'
import type { OwnReportsRepository, ResolveReportResult } from './model.js'
import { compareReports, toPublicReport } from './catalog.js'

export class ReportEditValidationError extends Error {
  constructor(readonly errors: Partial<Record<keyof EditReportInput, ReportValidationIssue>> = {}) {
    super('Los datos del reporte no son válidos.')
  }
}

export class EditReport {
  constructor(private readonly repository: Pick<OwnReportsRepository, 'editOwned'>) {}

  async execute(
    id: string,
    ownerId: string,
    input: EditReportInput,
  ): Promise<ReportSummary | 'forbidden' | 'not_found' | 'resolved'> {
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new ReportEditValidationError()
    const fields = Object.keys(input)
    if (!fields.length || fields.some((field) => field !== 'title'))
      throw new ReportEditValidationError()
    const patch = { ...input }
    if ('title' in patch) {
      if (typeof patch.title !== 'string' || !patch.title.trim())
        throw new ReportEditValidationError({ title: 'required' })
      patch.title = patch.title.trim()
    }
    const result = await this.repository.editOwned(id, ownerId, patch)
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
