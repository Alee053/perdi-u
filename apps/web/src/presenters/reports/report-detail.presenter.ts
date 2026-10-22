import type { ReportDetailRepository } from '../../models/reports/reports-repository.js'
import type { AuthPresenter } from '../auth/auth.presenter.js'
import { Store } from '../store.js'
import { toReportCard, type ReportCard } from './report-card.js'

export type ReportDetailState =
  | { status: 'closed' }
  | { status: 'loading'; id: string }
  | { status: 'ready'; id: string; card: ReportCard; authorId: string; active: boolean }
  | { status: 'unavailable' | 'error'; id: string; message: string }

interface Dependencies {
  repository: ReportDetailRepository
  auth: Pick<AuthPresenter, 'getSnapshot' | 'subscribe'>
}

const unavailable = 'Reporte no disponible.'
const loadFailed = 'No se pudo cargar el reporte. Intenta nuevamente.'

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
    })
  }

  /** Loads the open report again, for example after a failure. */
  retry = async () => {
    if (this.state.status !== 'closed') await this.open(this.state.id)
  }
}
