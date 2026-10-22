import { matchesFilters } from '../../models/reports/filters.js'
import type { CatalogReport, OwnReport, Report } from '../../models/reports/report.js'
import { summarizeReports } from '../../models/reports/stats.js'
import type { NoticePresenter } from '../app/notice.presenter.js'
import { toReportFilters, type FilterSelection } from '../catalog/filters.presenter.js'
import type { Effects } from '../effects.js'
import { Store } from '../store.js'
import { toReportCard, type ReportCard } from './report-card.js'

export interface ReportsState {
  /** Demo reports, including the ones published in this session. */
  reports: Report[]
  saved: string[]
  /** Saved catalog reports, kept so they stay visible after the search changes. */
  savedCatalog: (CatalogReport | OwnReport)[]
  selected: Report | null
}

export interface ReportDetailView {
  card: ReportCard
  saved: boolean
  canContact: boolean
  canResolve: boolean
}

export interface MapPin {
  id: string
  label: string
  tone: Report['type']
  top: string
  left: string
  number: number
}

interface Dependencies {
  catalog: { find(id: string): CatalogReport | undefined }
  own?: { find(id: string): OwnReport | undefined }
  notices: Pick<NoticePresenter, 'show'>
  effects: Pick<Effects, 'openWhatsApp'>
}

const isActive = (report: Report) => report.state === 'active'

/**
 * Community reports outside the public catalog (overview, map and saved list) and the
 * report detail. The rules come from the model; this class decides what each screen shows.
 */
export class ReportsPresenter extends Store<ReportsState> {
  constructor(
    reports: Report[],
    private readonly dependencies: Dependencies,
    saved: string[] = [],
  ) {
    super({ reports, saved, savedCatalog: [], selected: null })
  }

  private update(patch: Partial<ReportsState>) {
    this.setState({ ...this.state, ...patch })
  }

  private find(id: string): Report | undefined {
    const { reports, savedCatalog } = this.state
    return (
      this.dependencies.own?.find(id) ??
      reports.find((report) => report.id === id) ??
      savedCatalog.find((report) => report.id === id) ??
      this.dependencies.catalog.find(id)
    )
  }

  toggleSaved = (id: string) => {
    const { saved, savedCatalog, selected } = this.state
    const wasSaved = saved.includes(id)
    const catalogReport =
      this.dependencies.own?.find(id) ??
      this.dependencies.catalog.find(id) ??
      (selected && selected.source !== 'demo' && selected.id === id ? selected : undefined)
    const retained = savedCatalog.filter((report) => report.id !== id)
    this.update({
      saved: wasSaved ? saved.filter((item) => item !== id) : [...saved, id],
      savedCatalog: !wasSaved && catalogReport ? [...retained, catalogReport] : retained,
    })
    this.dependencies.notices.show(
      wasSaved
        ? 'Quitaste este reporte de tus guardados.'
        : 'Guardaste este reporte para revisarlo después.',
    )
  }

  open = (id: string) => this.update({ selected: this.find(id) ?? null })
  close = () => this.update({ selected: null })

  /** Applied only after the server acknowledges the close. */
  markResolved = (id: string) =>
    this.update({
      savedCatalog: this.state.savedCatalog.map((report) =>
        report.id === id ? { ...report, state: 'resolved' } : report,
      ),
      selected:
        this.state.selected?.id === id
          ? { ...this.state.selected, state: 'resolved' }
          : this.state.selected,
    })

  contact = (id: string) => {
    const report = this.find(id)
    if (report?.source !== 'demo') return
    this.dependencies.effects.openWhatsApp(
      report.phone,
      'Hola, vi tu reporte "' + report.title + '" en PerdiU. ¿Podemos coordinar?',
    )
  }

  add = (report: Report) => this.update({ reports: [report, ...this.state.reports] })
  /** Private, per-account state must not survive the session. */
  clearPrivateData = () => this.update({ saved: [], savedCatalog: [], selected: null })

  isSaved = (id: string) => this.state.saved.includes(id)

  saved = () => {
    const { saved, savedCatalog, reports } = this.state
    return [...savedCatalog, ...reports]
      .filter((report) => saved.includes(report.id) && isActive(report))
      .map(toReportCard)
  }

  counts = () => ({ saved: this.state.saved.length })

  detail = (): ReportDetailView | null => {
    const { selected } = this.state
    // Prefer the current entity after a confirmed server update.
    const report = selected && (this.find(selected.id) ?? selected)
    if (!report) return null
    const canResolve = report.source === 'own' && isActive(report)
    return {
      card: toReportCard(report),
      saved: this.isSaved(report.id),
      canContact: !canResolve && report.source === 'demo',
      canResolve,
    }
  }

  overview = () => {
    const stats = summarizeReports(this.state.reports)
    return {
      metrics: [
        { label: 'Reportes activos', value: stats.active },
        { label: 'Perdidos', value: stats.lost },
        { label: 'Encontrados', value: stats.found },
        { label: 'Resueltos', value: stats.resolved },
      ],
      cities: [...stats.byCity, { city: 'Otras ciudades', count: stats.other }],
      recent: this.state.reports.filter(isActive).slice(0, 3).map(toReportCard),
    }
  }

  mapView = (selection: FilterSelection) => {
    const filters = toReportFilters(selection)
    const visible = this.state.reports.filter((report) => matchesFilters(report, filters))
    const pins: MapPin[] = visible
      .filter((report) => report.source === 'demo')
      .slice(0, 8)
      .map((report, index) => ({
        id: report.id,
        label: 'Ver ' + report.title,
        tone: report.type,
        top: report.position.top,
        left: report.position.left,
        number: index + 1,
      }))
    return { count: visible.length, pins, list: visible.slice(0, 7).map(toReportCard) }
  }
}
