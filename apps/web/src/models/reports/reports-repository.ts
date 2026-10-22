import type { ReportContact, ReportQuery, ReportSummary } from '@perdiu/contracts'

/** Port for the public catalog; the HTTP adapter validates the DTO before returning it. */
export interface ReportsRepository {
  list(signal: AbortSignal, query?: ReportQuery): Promise<ReportSummary[]>
}

/** Port for one report reached by its link; the API decides what this session may see. */
export interface ReportDetailRepository {
  /** Undefined when the report does not exist or is not available to the current session. */
  find(id: string, signal: AbortSignal): Promise<ReportSummary | undefined>
  /**
   * Private contact for the current session; rejects with `SessionRejected` without a valid one.
   * Undefined when the report is no longer available.
   */
  contact(id: string): Promise<ReportContact | undefined>
}
