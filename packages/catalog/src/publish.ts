import type { ReportData } from '@perdiu/contracts'

export type ReportDraft = Pick<
  ReportData,
  'title' | 'description' | 'type' | 'category' | 'city' | 'zone' | 'incidentDate'
> & { whatsapp: string }

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
    if (draft.type !== 'lost' && draft.type !== 'found')
      throw new ReportValidationError('type', 'El tipo debe ser pérdida o hallazgo.')
    if (!draft.title.trim())
      throw new ReportValidationError('title', 'El nombre del reporte es obligatorio.')
    if (draft.title.trim().length > 200)
      throw new ReportValidationError('title', 'El título no puede superar los 200 caracteres.')
    if (draft.description.trim().length < 20)
      throw new ReportValidationError(
        'description',
        'La descripción debe tener al menos 20 caracteres.',
      )
    if (!draft.city.trim()) throw new ReportValidationError('city', 'La ciudad es obligatoria.')
    if (!draft.zone.trim()) throw new ReportValidationError('zone', 'La zona es obligatoria.')
    const incidentDate = new Date(`${draft.incidentDate}T00:00:00.000Z`)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(draft.incidentDate) ||
      draft.incidentDate.startsWith('0000') ||
      Number.isNaN(incidentDate.getTime()) ||
      incidentDate.toISOString().slice(0, 10) !== draft.incidentDate
    )
      throw new ReportValidationError('incidentDate', 'La fecha del hecho no es válida.')
    const whatsapp = draft.whatsapp.replace(/[\s()-]/g, '')
    if (!/^\+[1-9]\d{7,14}$/.test(whatsapp))
      throw new ReportValidationError(
        'whatsapp',
        'Incluye el código de país y revisa el número de WhatsApp.',
      )
    return this.creator.create({
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      whatsapp,
      ownerId,
      state: 'active',
    })
  }
}
