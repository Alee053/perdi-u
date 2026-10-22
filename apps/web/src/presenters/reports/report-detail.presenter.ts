import { SessionRejected } from '../../models/auth/session.js'
import { whatsAppUrl } from '../../models/reports/contact.js'
import type { CatalogReport } from '../../models/reports/report.js'
import type { ReportDetailRepository } from '../../models/reports/reports-repository.js'
import type { AuthPresenter } from '../auth/auth.presenter.js'
import type { Effects } from '../effects.js'
import { Store } from '../store.js'
import { toReportCard, type ReportCard } from './report-card.js'
import { parseReportPath, reportPath } from './report-route.js'
import type { ReportDetailView } from './reports.presenter.js'

export type ReportDetailState =
  | { status: 'closed' }
  | { status: 'loading'; id: string }
  | {
      status: 'ready'
      id: string
      card: ReportCard
      authorId: string
      active: boolean
      contacting: boolean
      /** Why the chat could not open; the phone itself never enters the state. */
      contactMessage?: string
    }
  | { status: 'unavailable' | 'error'; id: string; message: string }

/** What the detail dialog shows for each state. */
export type ReportLinkView =
  | { status: 'loading' }
  | { status: 'unavailable' | 'error'; message: string; canRetry: boolean }
  | { status: 'ready'; detail: ReportDetailView; contacting: boolean; contactMessage?: string }

interface Dependencies {
  repository: ReportDetailRepository
  auth: Pick<AuthPresenter, 'getSnapshot' | 'subscribe'>
  effects: Pick<
    Effects,
    'openWhatsApp' | 'absoluteUrl' | 'currentPath' | 'showPath' | 'onPathChange' | 'back'
  >
  /** Opens the login screen; the report stays open behind it to return to after signing in. */
  onLoginRequired: () => void
  isSaved: (id: string) => boolean
  /** Whether the private history has loaded this report for resolving it. */
  canResolve?: (id: string) => boolean
}

const unavailable = 'Reporte no disponible.'
const loadFailed = 'No se pudo cargar el reporte. Intenta nuevamente.'
const noContact = 'La persona que publicó este reporte no tiene un WhatsApp disponible.'
const contactFailed = 'No se pudo obtener el contacto. Intenta nuevamente.'

/** Report reached by its link: loading, unavailable, error/retry and contact with the author. */
export class ReportDetailPresenter extends Store<ReportDetailState> {
  /** The detail added a history entry, so closing it is the same as «Atrás». */
  private pushed = false
  private request = 0
  private controller?: AbortController
  /** Who the shown report was loaded for: an account ID, null for a visitor. */
  private loadedFor?: string | null
  /** Public DTO of the shown report; it never holds contact data. */
  private loaded?: CatalogReport
  constructor(private readonly dependencies: Dependencies) {
    super({ status: 'closed' })
  }

  /** Undefined while the session is being restored: the answer depends on who is looking. */
  private viewer() {
    const session = this.dependencies.auth.getSnapshot()
    if (session.status === 'restoring') return undefined
    return session.status === 'authenticated' ? session.user.id : null
  }

  private cancel() {
    this.request++
    this.controller?.abort()
  }

  /** Opens a report from the app and gives it its own address. */
  open = async (id: string) => {
    this.dependencies.effects.showPath(reportPath(id), 'push')
    this.pushed = true
    await this.load(id)
  }

  /** Follows the address bar and the session; returns the cleanup for the view's lifecycle. */
  start = () => {
    const { effects, auth } = this.dependencies
    const stopFollowing = effects.onPathChange(this.followPath)
    const unsubscribe = auth.subscribe(this.followSession)
    this.followPath(effects.currentPath())
    return () => {
      stopFollowing()
      unsubscribe()
      this.cancel()
    }
  }

  close = () => {
    if (this.state.status === 'closed') return
    this.cancel()
    this.setState({ status: 'closed' })
    const { effects } = this.dependencies
    // A direct link has nothing behind it in PerdiU: replace the address instead of leaving.
    if (this.pushed) effects.back()
    else effects.showPath('/', 'replace')
    this.pushed = false
  }

  private followPath = (path: string) => {
    const id = parseReportPath(path)
    if (!id) {
      this.pushed = false
      this.cancel()
      if (this.state.status !== 'closed') this.setState({ status: 'closed' })
    } else if (this.state.status === 'closed' || this.state.id !== id) void this.load(id)
  }

  /** Signing in, out or switching accounts may change what this person can see of the report. */
  private followSession = () => {
    const viewer = this.viewer()
    if (viewer !== undefined && viewer !== this.loadedFor && this.state.status !== 'closed')
      void this.load(this.state.id)
  }

  private load = async (id: string) => {
    this.cancel()
    const request = this.request
    this.setState({ status: 'loading', id })
    this.loadedFor = this.viewer()
    // The session subscription loads it once Auth has finished restoring.
    if (this.loadedFor === undefined) return
    this.controller = new AbortController()
    let report
    try {
      report = await this.dependencies.repository.find(id, this.controller.signal)
    } catch {
      if (request === this.request) this.setState({ status: 'error', id, message: loadFailed })
      return
    }
    if (request !== this.request) return
    if (!report) {
      this.setState({ status: 'unavailable', id, message: unavailable })
      return
    }
    this.loaded = { ...report, source: 'catalog' }
    this.setState({
      status: 'ready',
      id,
      card: toReportCard(this.loaded),
      authorId: report.author.id,
      active: report.state === 'active',
      contacting: false,
    })
  }

  /** WhatsApp with the author: a visitor is asked to sign in first. */
  contact = async () => {
    const report = this.state
    if (report.status !== 'ready' || report.contacting || !this.canContact()) return
    const { auth, repository, effects, onLoginRequired } = this.dependencies
    if (auth.getSnapshot().status !== 'authenticated') return onLoginRequired()
    this.setState({ ...report, contacting: true, contactMessage: undefined })
    let contact
    try {
      contact = await repository.contact(report.id)
    } catch (error) {
      this.setState({ ...report, contacting: false, contactMessage: contactFailed })
      // The API rejected the session: signing in again gives access to the contact.
      if (error instanceof SessionRejected) onLoginRequired()
      return
    }
    if (this.state.status !== 'ready' || this.state.id !== report.id) return
    if (!contact) {
      this.setState({ status: 'unavailable', id: report.id, message: unavailable })
      return
    }
    const link = effects.absoluteUrl(reportPath(report.id))
    const url =
      contact.available &&
      whatsAppUrl(
        contact.whatsapp,
        `Hola, vi tu reporte "${report.card.title}" en PerdiU y quiero coordinar contigo: ${link}`,
      )
    this.setState({ ...report, contacting: false, ...(!url && { contactMessage: noContact }) })
    if (url) effects.openWhatsApp(url)
  }

  view = (): ReportLinkView | null => {
    const { state } = this
    if (state.status === 'closed') return null
    if (state.status === 'loading') return { status: 'loading' }
    if (state.status !== 'ready')
      return { status: state.status, message: state.message, canRetry: state.status === 'error' }
    return {
      status: 'ready',
      detail: {
        card: state.card,
        saved: this.dependencies.isSaved(state.id),
        canContact: this.canContact(),
        canResolve: this.canResolve(),
      },
      contacting: state.contacting,
      ...(state.contactMessage && { contactMessage: state.contactMessage }),
    }
  }

  /** Entity of the open report, so it can be saved like a catalog card. */
  find = (id: string): CatalogReport | undefined =>
    this.state.status === 'ready' && this.loaded?.id === id ? this.loaded : undefined

  /** Active reports of another person; the author does not contact themselves. */
  canContact = () => {
    const { state } = this
    const session = this.dependencies.auth.getSnapshot()
    return (
      state.status === 'ready' &&
      state.active &&
      !(session.status === 'authenticated' && session.user.id === state.authorId)
    )
  }

  private canResolve() {
    const { state } = this
    const session = this.dependencies.auth.getSnapshot()
    return (
      state.status === 'ready' &&
      state.active &&
      session.status === 'authenticated' &&
      session.user.id === state.authorId &&
      this.dependencies.canResolve?.(state.id) === true
    )
  }

  /** Loads the open report again, for example after a failure. */
  retry = async () => {
    if (this.state.status !== 'closed') await this.load(this.state.id)
  }

  /** Applied after the server's acknowledgement, before refreshing any public query. */
  markResolved = (id: string) => {
    if (this.state.status === 'closed' || this.state.id !== id || this.loaded?.id !== id) return
    this.cancel()
    this.loaded = { ...this.loaded, state: 'resolved' }
    this.setState({
      status: 'ready',
      id,
      card: toReportCard(this.loaded),
      authorId: this.loaded.author.id,
      active: false,
      contacting: false,
    })
  }
}
