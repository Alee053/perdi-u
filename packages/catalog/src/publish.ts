import type { CreateReportInput, ReportValidationErrors } from '@perdiu/contracts'
import { toPublicReport } from './catalog.js'
import type { ReportPublisher } from './model.js'

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === 'object' && input !== null && !Array.isArray(input)

export function normalizeReportPhone(phone: string) {
  return phone.trim().replace(/[\s().-]/g, '')
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Validation shared by the publication use case and its HTTP boundary. */
export function validateReportDraft(input: unknown): ReportValidationErrors {
  if (!isRecord(input)) return { title: 'required' }
  const draft = input as Partial<CreateReportInput>
  const errors: ReportValidationErrors = {}
  const required = (field: keyof CreateReportInput, max: number) => {
    const value = draft[field]
    if (typeof value !== 'string' || !value.trim()) errors[field] = 'required'
    else if (value.trim().length > max) errors[field] = 'too_long'
  }

  required('title', 200)
  required('city', 100)
  required('zone', 200)
  if (typeof draft.description !== 'string' || !draft.description.trim())
    errors.description = 'required'
  else if (draft.description.trim().length < 20) errors.description = 'too_short'
  else if (draft.description.trim().length > 5000) errors.description = 'too_long'

  if (draft.type !== 'lost' && draft.type !== 'found') errors.type = 'invalid'
  if (draft.category !== 'pet' && draft.category !== 'object' && draft.category !== 'document')
    errors.category = 'invalid'
  if (draft.category === 'pet') required('petSpecies', 100)
  if (typeof draft.incidentDate !== 'string' || !draft.incidentDate.trim())
    errors.incidentDate = 'required'
  else if (!isDate(draft.incidentDate)) errors.incidentDate = 'invalid'
  if (typeof draft.phone !== 'string' || !draft.phone.trim()) errors.phone = 'required'
  else if (!/^\+[1-9]\d{7,14}$/.test(normalizeReportPhone(draft.phone))) errors.phone = 'invalid'

  return errors
}

export class ReportValidationError extends Error {
  constructor(readonly errors: ReportValidationErrors) {
    super('El reporte no cumple los requisitos.')
  }
}

export class CreateReport {
  constructor(private readonly publisher: ReportPublisher) {}

  async execute(ownerId: string, input: unknown) {
    const errors = validateReportDraft(input)
    if (Object.keys(errors).length) throw new ReportValidationError(errors)

    const draft = input as CreateReportInput
    const normalized: CreateReportInput = {
      type: draft.type,
      category: draft.category,
      title: draft.title.trim(),
      description: draft.description.trim(),
      city: draft.city.trim(),
      zone: draft.zone.trim(),
      incidentDate: draft.incidentDate,
      phone: normalizeReportPhone(draft.phone),
      ...(draft.category === 'pet' ? { petSpecies: draft.petSpecies!.trim() } : {}),
    }
    return toPublicReport(await this.publisher.create(ownerId, normalized))
  }
}
