import type { ReportData } from '@perdiu/contracts'

export type ReportDraft = Pick<
  ReportData,
  'title' | 'description' | 'type' | 'category' | 'city' | 'zone' | 'incidentDate'
>

export type ReportCreation = ReportDraft & { ownerId: string; state: 'active' }

export interface ReportCreator {
  create(report: ReportCreation): Promise<ReportData>
}

export class ReportValidationError extends Error {
  constructor(
    readonly field: keyof ReportDraft,
    message: string,
  ) {
    super(message)
    this.name = 'ReportValidationError'
  }
}

export class CreateReport {
  constructor(private readonly creator: ReportCreator) {}

  async execute(ownerId: string, draft: ReportDraft): Promise<ReportData> {
    if (!draft.title.trim())
      throw new ReportValidationError('title', 'El nombre del reporte es obligatorio.')
    if (draft.description.trim().length < 20)
      throw new ReportValidationError(
        'description',
        'La descripción debe tener al menos 20 caracteres.',
      )
    return this.creator.create({
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      ownerId,
      state: 'active',
    })
  }
}
