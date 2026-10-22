import { SessionRejected } from '../../models/auth/session.js'
import { whatsAppUrl } from '../../models/reports/contact.js'
import type { ReportDetailRepository } from '../../models/reports/reports-repository.js'
import type { AuthPresenter } from '../auth/auth.presenter.js'
import type { Effects } from '../effects.js'
import { Store } from '../store.js'
import { toReportCard, type ReportCard } from './report-card.js'
import { reportPath } from './report-route.js'

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

interface Dependencies {
  repository: ReportDetailRepository
  auth: Pick<AuthPresenter, 'getSnapshot' | 'subscribe'>
  effects: Pick<Effects, 'openWhatsApp' | 'absoluteUrl'>
  /** Opens the login screen; the report stays open behind it to return to after signing in. */
  onLoginRequired: () => void
}

const unavailable = 'Reporte no disponible.'
const loadFailed = 'No se pudo cargar el reporte. Intenta nuevamente.'
const noContact = 'La persona que publicó este reporte no tiene un WhatsApp disponible.'
const contactFailed = 'No se pudo obtener el contacto. Intenta nuevamente.'

/** Report reached by its link: loading, unavailable, error/retry and contact with the author. */
export class ReportDetailPresenter extends Store<ReportDetailState> {
  constructor(private readonly dependencies: Dependencies) {
    super({ status: 'closed' })
  }

  open = async (id: string) => {
    this.setState({ status: 'loading', id })
    let report
    try {
      report = await this.dependencies.repository.find(id, new AbortController().signal)
    } catch {
      this.setState({ status: 'error', id, message: loadFailed })
      return
    }
    if (!report) {
      this.setState({ status: 'unavailable', id, message: unavailable })
      return
    }
    this.setState({
      status: 'ready',
      id,
      card: toReportCard({ ...report, source: 'catalog' }),
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

  /** Loads the open report again, for example after a failure. */
  retry = async () => {
    if (this.state.status !== 'closed') await this.open(this.state.id)
  }
}
