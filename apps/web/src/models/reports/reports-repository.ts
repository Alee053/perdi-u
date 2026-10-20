import type { ReportQuery, ReportSummary } from '@perdiu/contracts'

/** Port for the public catalog; the HTTP adapter validates the DTO before returning it. */
export interface ReportsRepository {
  list(signal: AbortSignal, query?: ReportQuery): Promise<ReportSummary[]>
}
