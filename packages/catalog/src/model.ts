import type { PublicProfile, ReportData, ReportQuery } from '@perdiu/contracts'

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
