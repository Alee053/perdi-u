import type { ReportCategory, ReportSummary, ReportType } from '@perdiu/contracts'

const invalidResponse = () => new Error('La respuesta del catálogo no es válida.')
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0
const category = (value: unknown): value is ReportCategory =>
  value === 'pet' || value === 'object' || value === 'document'
const type = (value: unknown): value is ReportType => value === 'lost' || value === 'found'

function imageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (/^\/(?!\/)/.test(value)) return !value.includes('\\')
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
  } catch {
    return false
  }
}

export function readReport(value: unknown, allowResolved = false): ReportSummary {
  if (
    !object(value) ||
    !text(value.id) ||
    !text(value.title) ||
    !text(value.description) ||
    !text(value.city) ||
    !text(value.zone) ||
    !category(value.category) ||
    !type(value.type) ||
    (value.state !== 'active' && (!allowResolved || value.state !== 'resolved')) ||
    !text(value.incidentDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.incidentDate) ||
    !Number.isFinite(Date.parse(value.incidentDate)) ||
    new Date(value.incidentDate).toISOString().slice(0, 10) !== value.incidentDate ||
    !text(value.createdAt) ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    !object(value.author) ||
    !text(value.author.id) ||
    !text(value.author.displayName) ||
    (value.author.photoUrl !== undefined && !imageUrl(value.author.photoUrl)) ||
    !Array.isArray(value.imageUrls)
  )
    throw invalidResponse()
  const imageUrls = value.imageUrls.map((url: unknown) => {
    if (!imageUrl(url)) throw invalidResponse()
    return url
  })
  return {
    id: value.id,
    type: value.type,
    state: value.state === 'resolved' ? 'resolved' : 'active',
    category: value.category,
    title: value.title,
    description: value.description,
    city: value.city,
    zone: value.zone,
    incidentDate: value.incidentDate,
    createdAt: value.createdAt,
    imageUrls,
    author: {
      id: value.author.id,
      displayName: value.author.displayName,
      ...(value.author.photoUrl ? { photoUrl: value.author.photoUrl } : {}),
    },
  }
}
