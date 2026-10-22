import type { ReportContact, ReportSummary } from '@perdiu/contracts'
import type { ReportDetailRepository, ReportRecord } from './model.js'
import { toWhatsAppNumber } from './contact.js'
import { toPublicReport } from './catalog.js'

/**
 * Active reports are public; a resolved one stays reachable only for its owner, identified by the
 * verified Auth subject. A display name never grants access.
 */
export const canView = (report: ReportRecord, viewerId?: string) =>
  report.state === 'active' || (viewerId !== undefined && report.ownerId === viewerId)

/** Detail of one report reached by its link. */
export class GetReport {
  constructor(private readonly repository: Pick<ReportDetailRepository, 'find'>) {}

  /** Undefined when the report does not exist or the viewer may not see it. */
  async execute(id: string, viewerId?: string): Promise<ReportSummary | undefined> {
    const report = await this.repository.find(id)
    return report && canView(report, viewerId) ? toPublicReport(report) : undefined
  }
}

/** WhatsApp contact of a report for a verified viewer. */
export class GetReportContact {
  constructor(private readonly repository: ReportDetailRepository) {}

  /** Undefined when the report does not exist or the viewer may not see it. */
  async execute(id: string, viewerId: string): Promise<ReportContact | undefined> {
    const report = await this.repository.find(id)
    if (!report || !canView(report, viewerId)) return undefined
    const phone = await this.repository.findContactPhone(report.id)
    const whatsapp = phone && toWhatsAppNumber(phone)
    return whatsapp ? { available: true, whatsapp } : { available: false }
  }
}
