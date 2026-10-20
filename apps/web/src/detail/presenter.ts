import type { ReportDetail } from '@perdiu/contracts'
import { SessionRejected } from '../auth/presenter.js'
import { categoryImages, presentReport } from '../catalog/presenter.js'
import type { CatalogReport } from '../types.js'
import { ContactUnavailable, ReportUnavailable, type ReportDetailClient } from './client.js'

export type ReportDetailState =
  | { status: 'idle' }
  | { status: 'loading'; id: string }
  | {
      status: 'ready'
      id: string
      report: CatalogReport
      contacting?: boolean
      contactMessage?: string
    }
  | { status: 'unavailable'; id: string }
  | { status: 'error'; id: string; message: string }

export function reportPath(id: string): string {
  return `/reports/${encodeURIComponent(id)}`
}

export function buildWhatsAppUrl(
  phone: string,
  report: Pick<ReportDetail, 'id' | 'title'>,
  origin: string,
): string {
  if (!/^591[67]\d{7}$/.test(phone)) throw new ContactUnavailable()
  const reportUrl = new URL(reportPath(report.id), origin)
  if (!['http:', 'https:'].includes(reportUrl.protocol)) throw new Error('Enlace no válido.')
  const message = `Hola, vi tu reporte "${report.title}" en PerdiU: ${reportUrl.href}. ¿Podemos coordinar?`
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export class ReportDetailPresenter {
  private state: ReportDetailState = { status: 'idle' }
  private listeners = new Set<() => void>()
  private request = 0
  private controller?: AbortController

  constructor(private readonly client: ReportDetailClient) {}

  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private setState(state: ReportDetailState) {
    this.state = state
    this.listeners.forEach((listener) => listener())
  }

  cancel() {
    this.request++
    this.controller?.abort()
  }

  async load(id: string) {
    this.cancel()
    const request = this.request
    this.controller = new AbortController()
    this.setState({ status: 'loading', id })
    try {
      const detail = await this.client.get(id, this.controller.signal)
      if (request !== this.request) return
      const report = presentReport(detail)
      this.setState({
        status: 'ready',
        id,
        report: {
          ...report,
          image: detail.imageUrls[0] || categoryImages[report.category],
        },
      })
    } catch (error) {
      if (request !== this.request) return
      if (error instanceof ReportUnavailable) this.setState({ status: 'unavailable', id })
      else
        this.setState({
          status: 'error',
          id,
          message: 'No se pudo cargar el reporte. Intenta nuevamente.',
        })
    }
  }

  async contact(origin: string): Promise<string | undefined> {
    if (this.state.status !== 'ready') return undefined
    const { id, report } = this.state
    this.setState({ status: 'ready', id, report, contacting: true })
    try {
      const { phone } = await this.client.contact(id)
      const url = buildWhatsAppUrl(phone, report, origin)
      this.setState({ status: 'ready', id, report })
      return url
    } catch (error) {
      if (error instanceof SessionRejected) throw error
      const message =
        error instanceof ContactUnavailable
          ? 'El contacto no está disponible.'
          : 'No se pudo cargar el contacto. Intenta nuevamente.'
      this.setState({ status: 'ready', id, report, contactMessage: message })
      return undefined
    }
  }
}
