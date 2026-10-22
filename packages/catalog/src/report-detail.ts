import type { ReportSummary } from '@perdiu/contracts'
import type { ReportDetailRepository, ReportRecord } from './model.js'
import { toPublicReport } from './projection.js'

/**
 * Active reports are public; a resolved one stays reachable only for its owner, identified by the
 * verified Auth subject. A display name never grants access.
 */
export const canView = (report: ReportRecord, viewerId?: string) =>
  report.state === 'active' || (viewerId !== undefined && report.ownerId === viewerId)

/** Detail of one report reached by its link. */
export class GetReport {
  constructor(private readonly repository: ReportDetailRepository) {}

  /** Undefined when the report does not exist or the viewer may not see it. */
  async execute(id: string, viewerId?: string): Promise<ReportSummary | undefined> {
    const report = await this.repository.find(id)
    return report && canView(report, viewerId) ? toPublicReport(report) : undefined
  }
}
