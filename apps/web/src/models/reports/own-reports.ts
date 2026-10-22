import type { ReportState, ReportSummary } from '@perdiu/contracts'

export const selectOwnReports = (
  reports: ReportSummary[],
  ownerId: string | null,
  state?: ReportState,
) => reports.filter((report) => report.author.id === ownerId && (!state || report.state === state))
