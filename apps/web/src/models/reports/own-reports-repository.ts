import type { ReportSummary } from '@perdiu/contracts'

export interface OwnReportsRepository {
  list(signal: AbortSignal): Promise<ReportSummary[]>
  resolve(id: string, signal: AbortSignal): Promise<void>
}

export class OwnReportsFailure extends Error {
  constructor(readonly reason: 'forbidden' | 'not_found' | 'unavailable') {
    super(reason)
  }
}
