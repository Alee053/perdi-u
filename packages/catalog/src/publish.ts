import type { ReportData } from '@perdiu/contracts'

export type ReportDraft = Pick<
  ReportData,
  'title' | 'description' | 'type' | 'category' | 'city' | 'zone' | 'incidentDate'
>

export type ReportCreation = ReportDraft & { ownerId: string }

export interface ReportCreator {
  create(report: ReportCreation): Promise<ReportData>
}

export class CreateReport {
  constructor(private readonly creator: ReportCreator) {}

  execute(ownerId: string, draft: ReportDraft): Promise<ReportData> {
    return this.creator.create({ ...draft, ownerId })
  }
}
