import type { ReportCategory, ReportQuery, ReportSummary } from '@perdiu/contracts'
import type { CatalogReport, Category, FilterStatus } from '../types.js'

export type CatalogState =
  | { status: 'loading'; reports: CatalogReport[] }
  | { status: 'ready'; reports: CatalogReport[] }
  | { status: 'error'; reports: CatalogReport[]; message: string }

export const categoryImages = {
  Mascota: '/images/pet.svg',
  Objeto: '/images/object.svg',
  Documentos: '/images/document.svg',
}
const categories: Record<ReportCategory, Category> = {
  pet: 'Mascota',
  object: 'Objeto',
  document: 'Documentos',
}
const categoryValues: Partial<Record<string, ReportCategory>> = {
  Mascota: 'pet',
  Objeto: 'object',
  Documentos: 'document',
}

export function presentReport(report: ReportSummary): CatalogReport {
  const category = categories[report.category]
  const name = report.author.displayName
  return {
    id: report.id,
    source: 'catalog',
    authorId: report.author.id,
    title: report.title,
    description: report.description,
    category,
    status: report.type === 'lost' ? 'Perdido' : 'Encontrado',
    city: report.city,
    zone: report.zone,
    date: new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeZone: 'UTC' }).format(
      new Date(report.incidentDate + 'T00:00:00Z'),
    ),
    posted: new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'medium',
      timeZone: 'America/La_Paz',
    }).format(new Date(report.createdAt)),
    image: report.imageUrls[0] || categoryImages[category],
    person: name,
    initials: name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toLocaleUpperCase('es'),
    color: 'lavender',
    resolved: report.state === 'resolved',
  }
}

export interface ReportsClient {
  list(signal: AbortSignal, query?: ReportQuery): Promise<ReportSummary[]>
}

export interface CatalogFilters {
  search: string
  city: string
  category: string
  status: FilterStatus
}

export const defaultCatalogFilters: CatalogFilters = {
  search: '',
  city: 'Todas las ciudades',
  category: 'Todas las categorías',
  status: 'Todos',
}

export class CatalogPresenter {
  private state: CatalogState = { status: 'loading', reports: [] }
  private listeners = new Set<() => void>()
  private request = 0
  private controller?: AbortController
  private query: ReportQuery = {}
  constructor(private readonly client: ReportsClient) {}
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private setState(state: CatalogState) {
    this.state = state
    this.listeners.forEach((listener) => listener())
  }

  cancel() {
    this.request++
    this.controller?.abort()
  }

  async load(filters?: CatalogFilters) {
    if (filters) {
      const category = categoryValues[filters.category]
      this.query = {
        ...(filters.search.trim() ? { q: filters.search.trim() } : {}),
        ...(filters.city !== 'Todas las ciudades' ? { city: filters.city } : {}),
        ...(category ? { category } : {}),
        ...(filters.status !== 'Todos'
          ? { type: filters.status === 'Perdido' ? 'lost' : 'found' }
          : {}),
      }
    }
    this.cancel()
    const request = this.request
    this.controller = new AbortController()
    this.setState({ status: 'loading', reports: [] })
    try {
      const reports = await this.client.list(this.controller.signal, { ...this.query })
      if (request === this.request)
        this.setState({ status: 'ready', reports: reports.map(presentReport) })
    } catch {
      if (request === this.request)
        this.setState({
          status: 'error',
          reports: [],
          message: 'No se pudo cargar el catálogo. Intenta nuevamente.',
        })
    }
  }
}
