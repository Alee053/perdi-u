import type { EditReportInput, ReportSummary, ReportValidationIssue } from '@perdiu/contracts'

export type OwnReportEditErrors = Partial<Record<keyof EditReportInput, ReportValidationIssue>>

export interface OwnReportsRepository {
  list(signal: AbortSignal): Promise<ReportSummary[]>
  resolve(id: string, signal: AbortSignal): Promise<void>
  edit(id: string, patch: EditReportInput, signal: AbortSignal): Promise<ReportSummary>
}

export class OwnReportsFailure extends Error {
  constructor(
    readonly reason: 'forbidden' | 'not_found' | 'conflict' | 'validation' | 'unavailable',
    readonly fieldErrors: OwnReportEditErrors = {},
  ) {
    super(reason)
  }
}
