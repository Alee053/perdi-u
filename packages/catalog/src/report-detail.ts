import type { ReportSummary } from '@perdiu/contracts'
import type { ReportDetailRepository } from './model.js'
import { toPublicReport } from './projection.js'

/** Detail of one report reached by its link. */
export class GetReport {
  constructor(private readonly repository: ReportDetailRepository) {}

  async execute(id: string): Promise<ReportSummary | undefined> {
    const report = await this.repository.find(id)
    return report && toPublicReport(report)
  }
}
