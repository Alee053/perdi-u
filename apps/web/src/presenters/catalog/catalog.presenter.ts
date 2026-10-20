import { REPORT_RESULT_LIMIT, type ReportQuery } from '@perdiu/contracts'
import { hasActiveFilters, toReportQuery } from '../../models/reports/filters.js'
import type { CatalogReport } from '../../models/reports/report.js'
import type { ReportsRepository } from '../../models/reports/reports-repository.js'
import { toReportCard, type ReportCard } from '../reports/report-card.js'
import { Store } from '../store.js'
import { toReportFilters, type FilterSelection } from './filters.presenter.js'

export type CatalogState =
  | { status: 'loading'; reports: ReportCard[] }
  | { status: 'ready'; reports: ReportCard[] }
  | { status: 'error'; reports: ReportCard[]; message: string }

/** Public catalog: loading, error/retry and cancellation of stale responses. */
export class CatalogPresenter extends Store<CatalogState> {
  private request = 0
  private controller?: AbortController
  private query: ReportQuery = {}
  private filtered = false
  private loaded: CatalogReport[] = []
  constructor(private readonly repository: ReportsRepository) {
    super({ status: 'loading', reports: [] })
  }

  cancel() {
    this.request++
    this.controller?.abort()
  }

  /** Without a selection it retries the last query. */
  async load(selection?: FilterSelection) {
    if (selection) {
      const filters = toReportFilters(selection)
      this.query = toReportQuery(filters)
      this.filtered = hasActiveFilters(filters)
    }
    this.cancel()
    const request = this.request
    this.controller = new AbortController()
    this.setState({ status: 'loading', reports: [] })
    try {
      const reports = await this.repository.list(this.controller.signal, { ...this.query })
      if (request !== this.request) return
      this.loaded = reports.map((report) => ({ ...report, source: 'catalog' }))
      this.setState({ status: 'ready', reports: this.loaded.map(toReportCard) })
    } catch {
      if (request === this.request)
        this.setState({
          status: 'error',
          reports: [],
          message: 'No se pudo cargar el catálogo. Intenta nuevamente.',
        })
    }
  }

  /** Entity behind a visible card, for saving it or opening its detail. */
  find(id: string) {
    return this.loaded.find((report) => report.id === id)
  }

  /** Texts for the empty state and the result limit; they depend on the active filters. */
  summary() {
    const { status, reports } = this.state
    return {
      count: reports.length,
      limitReached: status === 'ready' && reports.length === REPORT_RESULT_LIMIT,
      limit: REPORT_RESULT_LIMIT,
      empty: this.filtered
        ? {
            title: 'No se encontraron coincidencias',
            description: 'Prueba con otra búsqueda o publica un reporte.',
          }
        : {
            title: 'Todavía no hay reportes',
            description: 'Cuando la comunidad publique reportes, aparecerán aquí.',
          },
    }
  }
}
