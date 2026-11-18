import { whatsAppUrl } from '../../models/reports/contact.js'
import type { CatalogReport, Report } from '../../models/reports/report.js'
import type { ReportDetailRepository } from '../../models/reports/reports-repository.js'
import type { NoticePresenter } from '../app/notice.presenter.js'
import type { CatalogPresenter } from '../catalog/catalog.presenter.js'
import type { Effects } from '../effects.js'
import { Store } from '../store.js'
import { toReportCard, toReportGallery, type ReportDetailView } from './report-card.js'

export interface ReportsState {
  /** Demo reports, including the ones published in this session. */
  reports: Report[]
  saved: string[]
  /** Saved catalog reports, kept so they stay visible after the search changes. */
  savedCatalog: CatalogReport[]
  savedStatus: 'idle' | 'loading' | 'ready' | 'error'
  savedMessage: string | null
  selected: Report | null
  selectedPhoto: number
}

interface Dependencies {
  catalog: Pick<CatalogPresenter, 'find' | 'view'>
  savedReports: Pick<ReportDetailRepository, 'find'>
  notices: Pick<NoticePresenter, 'show'>
  effects: Pick<Effects, 'openWhatsApp'>
  /** Opens a catalog report through its stable link. */
  links: { open(id: string): void }
}

const isActive = (report: Report) => report.state === 'active'

/**
 * Report projections for locations, the saved list and the demo detail.
 */
export class ReportsPresenter extends Store<ReportsState> {
  private savedRequest = 0
  private savedController?: AbortController
  constructor(
    reports: Report[],
    private readonly dependencies: Dependencies,
    saved: string[] = [],
  ) {
    super({
      reports,
      saved,
      savedCatalog: [],
      savedStatus: 'idle',
      savedMessage: null,
      selected: null,
      selectedPhoto: 0,
    })
  }

  private update(patch: Partial<ReportsState>) {
    this.setState({ ...this.state, ...patch })
  }

  private find(id: string): Report | undefined {
    const { reports, savedCatalog } = this.state
    return (
      reports.find((report) => report.id === id) ??
      savedCatalog.find((report) => report.id === id) ??
      this.dependencies.catalog.find(id)
    )
  }

  toggleSaved = (id: string) => {
    const { saved, savedCatalog, selected } = this.state
    const wasSaved = saved.includes(id)
    const catalogReport =
      this.dependencies.catalog.find(id) ??
      (selected?.source === 'catalog' && selected.id === id ? selected : undefined)
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

  /** Demo reports keep the local detail; catalog reports open through their stable link. */
  open = (id: string) => {
    const report = this.find(id)
    if (report?.source === 'demo') this.update({ selected: report, selectedPhoto: 0 })
    else this.dependencies.links.open(id)
  }
  close = () => this.update({ selected: null })

  selectPhoto = (index: number) => {
    const { selected } = this.state
    if (!selected || !Number.isInteger(index) || !toReportCard(selected).images[index]) return
    this.update({ selectedPhoto: index })
  }

  nextPhoto = () => this.movePhoto(1)
  previousPhoto = () => this.movePhoto(-1)
  private movePhoto(step: number) {
    if (!this.state.selected) return
    const count = toReportCard(this.state.selected).images.length
    this.selectPhoto((this.state.selectedPhoto + count + step) % count)
  }

  markResolved = (id: string) =>
    this.update({
      saved: this.state.saved.filter((saved) => saved !== id),
      savedCatalog: this.state.savedCatalog.filter((report) => report.id !== id),
    })

  refreshSaved = async () => {
    this.savedController?.abort()
    const request = ++this.savedRequest
    const ids = this.state.saved.filter((id) =>
      this.state.savedCatalog.some((report) => report.id === id),
    )
    if (!ids.length) {
      this.update({ savedStatus: 'ready', savedMessage: null })
      return
    }
    const controller = new AbortController()
    this.savedController = controller
    this.update({ savedStatus: 'loading', savedMessage: null })
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          return { id, report: await this.dependencies.savedReports.find(id, controller.signal) }
        } catch {
          return { id, failed: true as const }
        }
      }),
    )
    if (request !== this.savedRequest) return
    let saved = this.state.saved
    let savedCatalog = this.state.savedCatalog
    let failed = false
    for (const result of results) {
      if (!this.state.saved.includes(result.id)) continue
      if ('failed' in result) {
        failed = true
        continue
      }
      if (!result.report || result.report.state !== 'active') {
        saved = saved.filter((id) => id !== result.id)
        savedCatalog = savedCatalog.filter((report) => report.id !== result.id)
      } else {
        savedCatalog = [
          ...savedCatalog.filter((report) => report.id !== result.id),
          { ...result.report, source: 'catalog' },
        ]
      }
    }
    this.update({
      saved,
      savedCatalog,
      savedStatus: failed ? 'error' : 'ready',
      savedMessage: failed ? 'No se pudo verificar tus guardados. Intenta nuevamente.' : null,
    })
  }

  contact = (id: string) => {
    const report = this.find(id)
    if (report?.source !== 'demo') return
    const url = whatsAppUrl(
      report.phone,
      'Hola, vi tu reporte "' + report.title + '" en PerdiU. ¿Podemos coordinar?',
    )
    if (url) this.dependencies.effects.openWhatsApp(url)
  }

  add = (report: Report) => this.update({ reports: [report, ...this.state.reports] })
  /** Private, per-account state must not survive the session. */
  clearPrivateData = () => {
    this.savedRequest++
    this.savedController?.abort()
    this.update({
      saved: [],
      savedCatalog: [],
      savedStatus: 'idle',
      savedMessage: null,
      selected: null,
    })
  }

  savedStatus = () => ({ status: this.state.savedStatus, message: this.state.savedMessage })

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
    // A demo report may have changed (resolved) since it was opened.
    const report = selected && (this.find(selected.id) ?? selected)
    if (!report) return null
    const canResolve = false
    const card = toReportCard(report)
    return {
      card,
      gallery: toReportGallery(card, this.state.selectedPhoto),
      saved: this.isSaved(report.id),
      canContact: !canResolve && report.source === 'demo',
      canResolve,
      canEdit: false,
    }
  }

  mapView = () => {
    const { reports, ...result } = this.dependencies.catalog.view()
    return {
      ...result,
      list: reports.map(({ id, title, status, category, city, zone }) => ({
        id,
        title,
        status,
        category,
        city,
        zone,
      })),
    }
  }
}
