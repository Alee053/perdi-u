import {
  ArrowRight,
  CheckCircle2,
  Heart,
  LockKeyhole,
  Link2,
  LoaderCircle,
  MapPin,
  MessageCircle,
  ShieldCheck,
  X,
} from 'lucide-react'
import type { Report } from '../../types'
import { statusColors } from '../../utils/text'

type ReportDetailProps = {
  report: Report
  saved: boolean
  onSave: () => void
  onContact?: () => void
  onResolve?: () => void
  onShare?: () => void
  contacting?: boolean
  contactMessage?: string
  onClose: () => void
  isOwn: boolean
}

export function ReportDetail({
  report,
  saved,
  onSave,
  onContact,
  onResolve,
  onShare,
  contacting = false,
  contactMessage,
  onClose,
  isOwn,
}: ReportDetailProps) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="modal-card detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <button className="modal-close on-image" onClick={onClose} aria-label="Cerrar">
          <X size={19} />
        </button>
        <div className="detail-image">
          <img src={report.image} alt={report.title} />
          <span className={'report-status ' + statusColors[report.status]}>
            <i />
            {report.resolved ? 'Resuelto' : report.status}
          </span>
          <button
            className={'save-button detail-save ' + (saved ? 'saved' : '')}
            onClick={onSave}
            aria-label="Guardar reporte"
          >
            <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
          </button>
          {onShare && (
            <button
              className="detail-share"
              onClick={onShare}
              aria-label="Copiar enlace del reporte"
              title="Copiar enlace"
            >
              <Link2 size={16} />
            </button>
          )}
        </div>
        <div className="detail-content">
          <div className="detail-meta">
            <span>{report.category}</span>
            <i /> {report.status}
            <i /> {report.posted}
          </div>
          <h2 id="detail-title">{report.title}</h2>
          <p>{report.description}</p>
          <div className="detail-location">
            <MapPin size={16} />
            <span>
              <b>{report.zone}</b>
              <small>
                {report.city}, Bolivia · {report.date}
              </small>
            </span>
          </div>
          <div className="poster-row">
            <span className={'poster-avatar ' + report.color}>{report.initials}</span>
            <span>
              <b>{report.person}</b>
              <small>Miembro de PerdiU</small>
            </span>
            <span className="poster-trust">
              <ShieldCheck size={14} /> Comunidad
            </span>
          </div>
          {isOwn && !report.resolved && onResolve ? (
            <button className="resolve-button full-resolve" onClick={onResolve}>
              <CheckCircle2 size={15} /> Marcar como resuelto
            </button>
          ) : (
            onContact && (
              <button
                className="primary-button contact-button"
                onClick={onContact}
                disabled={contacting}
              >
                {contacting ? (
                  <>
                    <LoaderCircle size={16} className="spin" /> Consultando contacto…
                  </>
                ) : (
                  <>
                    <MessageCircle size={17} /> Contactar por WhatsApp <ArrowRight size={15} />
                  </>
                )}
              </button>
            )
          )}
          {contactMessage && (
            <small className="contact-error" role="alert">
              {contactMessage}
            </small>
          )}
          <small className="contact-privacy">
            <LockKeyhole size={12} /> Tu correo no se muestra. Coordina el contacto con cuidado.
          </small>
        </div>
      </div>
    </div>
  )
}

export function ReportDetailStatus({
  status,
  message,
  onRetry,
  onClose,
}: {
  status: 'loading' | 'unavailable' | 'error'
  message?: string
  onRetry?: () => void
  onClose: () => void
}) {
  const loading = status === 'loading'
  const unavailable = status === 'unavailable'
  return (
    <div className="modal-backdrop">
      <section
        className="modal-card detail-modal detail-state"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-state-title"
      >
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={19} />
        </button>
        <div className="detail-state-content" aria-live="polite">
          {loading && <LoaderCircle size={22} className="spin" />}
          <h2 id="detail-state-title">
            {loading
              ? 'Cargando reporte…'
              : unavailable
                ? 'Reporte no disponible'
                : 'No se pudo cargar el reporte'}
          </h2>
          {!loading && !unavailable && <p role="alert">{message}</p>}
          {status === 'error' && onRetry && (
            <button className="primary-button" onClick={onRetry}>
              Intentar nuevamente
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
