import type {
  CreateReportInput,
  OwnReportQuery,
  PublicProfile,
  ReportData,
  ReportQuery,
} from '@perdiu/contracts'

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
  /** Private contact phone as stored; read only after the case of use has checked access. */
  findContactPhone(reportId: string): Promise<string | undefined>
}

/** Write port kept separate from the public catalog query. */
export interface ReportPublisher {
  create(ownerId: string, draft: CreateReportInput): Promise<ReportRecord>
}

export type ResolveReportResult = 'resolved' | 'forbidden' | 'not_found'

/** Private history and atomic closure, always scoped to the verified subject. */
export interface OwnReportsRepository {
  listOwned(ownerId: string, query?: OwnReportQuery): Promise<ReportRecord[]>
  /** Change only active state; authorized repeats succeed without another write. */
  resolveOwned(id: string, ownerId: string): Promise<ResolveReportResult>
}
