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

/** Port of the report detail; access rules and public projection belong to the cases of use. */
export interface ReportDetailRepository {
  /** One report in any state, or undefined when the ID does not exist. */
  find(id: string): Promise<ReportRecord | undefined>
}
