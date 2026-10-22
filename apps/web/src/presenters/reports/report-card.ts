import type { ReportCategory, ReportType } from '@perdiu/contracts'
import type { Report } from '../../models/reports/report.js'

/** What a card, list row or detail shows of a report: labels and dates already formatted. */
export interface ReportCard {
  id: string
  source: Report['source']
  title: string
  description: string
  category: string
  petSpecies?: string
  /** Type of report: «Perdido» or «Encontrado». */
  status: string
  /** Badge over the photo: the type, or «Resuelto» once it is closed. */
  badge: string
  tone: ReportType
  resolved: boolean
  city: string
  zone: string
  date: string
  posted: string
  image: string
  person: string
}

export const categoryLabels: Record<ReportCategory, string> = {
  pet: 'Mascota',
  object: 'Objeto',
  document: 'Documentos',
}
export const typeLabels: Record<ReportType, string> = { lost: 'Perdido', found: 'Encontrado' }
export const categoryImages: Record<ReportCategory, string> = {
  pet: '/images/pet.svg',
  object: '/images/object.svg',
  document: '/images/document.svg',
}

const incidentDay = new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeZone: 'UTC' })
const publishedDay = new Intl.DateTimeFormat('es-BO', {
  dateStyle: 'medium',
  timeZone: 'America/La_Paz',
})

export function toReportCard(report: Report): ReportCard {
  const resolved = report.state === 'resolved'
  return {
    id: report.id,
    source: report.source,
    title: report.title,
    description: report.description,
    category: categoryLabels[report.category],
    ...(report.petSpecies ? { petSpecies: report.petSpecies } : {}),
    status: typeLabels[report.type],
    badge: resolved ? 'Resuelto' : typeLabels[report.type],
    tone: report.type,
    resolved,
    city: report.city,
    zone: report.zone,
    date: incidentDay.format(new Date(report.incidentDate + 'T00:00:00Z')),
    posted: publishedDay.format(new Date(report.createdAt)),
    image: report.imageUrls[0] || categoryImages[report.category],
    person: report.author.displayName,
  }
}
