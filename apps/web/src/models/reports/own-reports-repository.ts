import type { EditReportInput, ReportSummary } from '@perdiu/contracts'

export interface OwnReportsRepository {
  list(signal: AbortSignal): Promise<ReportSummary[]>
  resolve(id: string, signal: AbortSignal): Promise<void>
  edit(id: string, patch: EditReportInput, signal: AbortSignal): Promise<ReportSummary>
}

export class OwnReportsFailure extends Error {
  constructor(readonly reason: 'forbidden' | 'not_found' | 'unavailable') {
    super(reason)
  }
}
