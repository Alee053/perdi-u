import type { OwnReport } from '../../models/reports/report.js'
import {
  OwnReportsFailure,
  type OwnReportsRepository,
} from '../../models/reports/own-reports-repository.js'
import { selectOwnReports } from '../../models/reports/own-reports.js'
import { SessionRejected } from '../../models/auth/session.js'
import type { AuthPresenter } from '../auth/auth.presenter.js'
import type { NoticePresenter } from '../app/notice.presenter.js'
import { Store } from '../store.js'
import { toReportCard } from './report-card.js'

export type OwnFilter = 'Todos' | 'Activos' | 'Resueltos'
interface OwnReportsState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  reports: OwnReport[]
  filter: OwnFilter
  message: string | null
  confirmation: string | null
  pending: boolean
  resolveError: string | null
}
interface Dependencies {
  notices: Pick<NoticePresenter, 'show'>
  onResolved: (report: OwnReport) => void
  onSessionRejected: () => void
  onOwnerChanged: () => void
}

const initialState = (): OwnReportsState => ({
  status: 'idle',
  reports: [],
  filter: 'Todos',
  message: null,
  confirmation: null,
  pending: false,
  resolveError: null,
})

export class OwnReportsPresenter extends Store<OwnReportsState> {
  private ownerId: string | null = null
  private ownerVersion = 0
  private request = 0
  private controller?: AbortController
  private mutation?: AbortController
  constructor(
    private readonly repository: OwnReportsRepository,
    private readonly dependencies: Dependencies,
  ) {
    super(initialState())
  }
  private update(patch: Partial<OwnReportsState>) {
    this.setState({ ...this.state, ...patch })
  }

  start = (auth: Pick<AuthPresenter, 'getSnapshot' | 'subscribe'>) => {
    const follow = () => {
      const session = auth.getSnapshot()
      void this.setOwner(session.status === 'authenticated' ? session.user.id : null)
    }
    const unsubscribe = auth.subscribe(follow)
    follow()
    return () => {
      unsubscribe()
      void this.setOwner(null)
    }
  }

  setOwner = async (ownerId: string | null) => {
    if (this.ownerId === ownerId) return
    this.ownerVersion++
    this.cancelLoad()
    this.mutation?.abort()
    this.ownerId = ownerId
    this.setState(initialState())
    this.dependencies.onOwnerChanged()
    if (ownerId) await this.load()
  }
  private cancelLoad() {
    this.request++
    this.controller?.abort()
  }
  private rejectSession() {
    void this.setOwner(null)
    this.dependencies.onSessionRejected()
  }
  load = async () => {
    const ownerId = this.ownerId
    if (!ownerId) return
    this.cancelLoad()
    const request = this.request
    this.controller = new AbortController()
    this.update({ status: 'loading', message: null })
    try {
      const reports = await this.repository.list(this.controller.signal)
      if (request !== this.request) return
      this.update({
        status: 'ready',
        reports: selectOwnReports(reports, ownerId).map((report) => ({ ...report, source: 'own' })),
      })
    } catch (error) {
      if (request !== this.request) return
      if (error instanceof SessionRejected) return this.rejectSession()
      this.update({
        status: 'error',
        message: 'No se pudo cargar tus reportes. Intenta nuevamente.',
      })
    }
  }
  setFilter = (filter: OwnFilter) => this.update({ filter })
  requestResolve = (id: string) => {
    if (!this.ownerId) return this.dependencies.onSessionRejected()
    if (this.state.pending || this.find(id)?.state !== 'active') return
    this.update({ confirmation: id, resolveError: null })
  }
  cancelResolve = () => {
    if (!this.state.pending) this.update({ confirmation: null, resolveError: null })
  }
  confirmResolve = async () => {
    const id = this.state.confirmation
    const report = id && this.find(id)
    if (!report || report.state !== 'active' || this.state.pending) return
    const version = this.ownerVersion
    this.mutation = new AbortController()
    this.update({ pending: true, resolveError: null })
    try {
      await this.repository.resolve(report.id, this.mutation.signal)
    } catch (error) {
      if (version !== this.ownerVersion) return
      if (error instanceof SessionRejected) return this.rejectSession()
      const message =
        error instanceof OwnReportsFailure && error.reason === 'forbidden'
          ? 'Solo puedes resolver tus propios reportes.'
          : error instanceof OwnReportsFailure && error.reason === 'not_found'
            ? 'El reporte ya no está disponible.'
            : 'No se pudo resolver el reporte. Intenta nuevamente.'
      this.update({ pending: false, resolveError: message })
      return
    }
    if (version !== this.ownerVersion) return
    this.cancelLoad()
    const resolved: OwnReport = { ...report, state: 'resolved' }
    this.update({
      status: 'ready',
      reports: this.state.reports.map((item) => (item.id === resolved.id ? resolved : item)),
      confirmation: null,
      pending: false,
      resolveError: null,
    })
    this.dependencies.onResolved(resolved)
    this.dependencies.notices.show(
      'Marcaste el reporte como resuelto; ya no aparecerá en las búsquedas.',
    )
  }
  find = (id: string) => this.state.reports.find((report) => report.id === id)

  view = () => {
    const { filter, status, message, confirmation, pending, resolveError } = this.state
    const own = selectOwnReports(this.state.reports, this.ownerId)
    const state = filter === 'Todos' ? undefined : filter === 'Activos' ? 'active' : 'resolved'
    return {
      status,
      message,
      filter,
      total: own.length,
      active: selectOwnReports(own, this.ownerId, 'active').length,
      cards: selectOwnReports(own, this.ownerId, state).map((report) =>
        toReportCard({ ...report, source: 'own' }),
      ),
      empty: {
        title:
          own.length === 0
            ? 'Aún no publicaste reportes'
            : filter === 'Resueltos'
              ? 'Todavía no tienes reportes resueltos'
              : 'No tienes reportes activos',
      },
      confirmation: confirmation
        ? {
            id: confirmation,
            title: this.find(confirmation)?.title ?? '',
            pending,
            error: resolveError,
          }
        : null,
    }
  }
}
