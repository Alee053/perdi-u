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
  stateLabel: string
  city: string
  zone: string
  date: string
  posted: string
  image: string
  images: string[]
  hasPhotos: boolean
  person: string
}

export interface ReportGalleryView {
  source: string
  alt: string
  caption: string
  canNavigate: boolean
  choices: { index: number; label: string; selected: boolean }[]
}

export interface ReportDetailView {
  card: ReportCard
  gallery: ReportGalleryView
  saved: boolean
  canContact: boolean
  canResolve: boolean
  canEdit: boolean
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
  const images = report.imageUrls.length ? [...report.imageUrls] : [categoryImages[report.category]]
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
    stateLabel: resolved ? 'Resuelto' : 'Activo',
    city: report.city,
    zone: report.zone,
    date: incidentDay.format(new Date(report.incidentDate + 'T00:00:00Z')),
    posted: publishedDay.format(new Date(report.createdAt)),
    image: images[0]!,
    images,
    hasPhotos: report.imageUrls.length > 0,
    person: report.author.displayName,
  }
}

/** The presenter owns the selection; the view receives accessible labels ready to render. */
export function toReportGallery(card: ReportCard, selected = 0): ReportGalleryView {
  const caption = card.hasPhotos
    ? `Foto ${selected + 1} de ${card.images.length}`
    : 'Imagen de referencia de categoría'
  return {
    source: card.images[selected]!,
    alt: `${caption}: ${card.title}`,
    caption,
    canNavigate: card.images.length > 1,
    choices:
      card.images.length > 1
        ? card.images.map((_, index) => ({
            index,
            label: `Ver foto ${index + 1} de ${card.images.length}`,
            selected: index === selected,
          }))
        : [],
  }
}
