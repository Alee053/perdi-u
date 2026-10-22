import type { OwnReportQuery, PublicProfile, ReportData, ReportQuery } from '@perdiu/contracts'

export interface ReportRecord extends ReportData {
  author: PublicProfile
  imageUrls: string[]
}

export interface ReportRepository {
  /** Apply all query predicates before limiting results. SQL/text normalization belongs to the adapter.
   * ListReports additionally enforces active state, stable order, result limit and public projection.
   */
  list(query?: ReportQuery): Promise<ReportRecord[]>
}

export type ResolveReportResult = 'resolved' | 'forbidden' | 'not_found'

export interface OwnReportsRepository {
  listOwned(ownerId: string, query: OwnReportQuery): Promise<ReportRecord[]>
  /** Atomically checks ownership and transitions active to resolved; repeats never write. */
  resolveOwned(id: string, ownerId: string): Promise<ResolveReportResult>
}
