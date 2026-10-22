import { LoaderCircle, X } from 'lucide-react'
import type { ReportLinkView } from '../../presenters/reports/report-detail.presenter'

type ReportDetailProps = {
  view: ReportLinkView
  onSave: () => void
  onContact: () => void
  onResolve: () => void
  onRetry?: () => void
  onClose: () => void
}

export function ReportDetail({
  view,
  onSave,
  onContact,
  onResolve,
  onRetry,
  onClose,
}: ReportDetailProps) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={view.status === 'ready' ? 'detail-title' : undefined}
        aria-label={view.status === 'ready' ? undefined : 'Detalle del reporte'}
        aria-busy={view.status === 'loading'}
      >
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>
        {view.status === 'loading' && (
          <p className="detail-state" role="status">
            <LoaderCircle size={16} className="spin" /> Cargando reporte…
          </p>
        )}
        {view.status === 'unavailable' && (
          <div className="detail-state">
            <h2>{view.message}</h2>
            <p>Puede que se haya cerrado o que el enlace no sea correcto.</p>
          </div>
        )}
        {view.status === 'error' && (
          <div className="detail-state" role="alert">
            <p>{view.message}</p>
            {view.canRetry && onRetry && (
              <button className="secondary-button" onClick={onRetry}>
                Reintentar
              </button>
            )}
          </div>
        )}
        {view.status === 'ready' && (
          <ReadyDetail view={view} {...{ onSave, onContact, onResolve }} />
        )}
      </div>
    </div>
  )
}

function ReadyDetail({
  view,
  onSave,
  onContact,
  onResolve,
}: {
  view: Extract<ReportLinkView, { status: 'ready' }>
  onSave: () => void
  onContact: () => void
  onResolve: () => void
}) {
  const { card: report, saved, canContact, canResolve } = view.detail
  return (
    <>
      <img className="detail-image" src={report.image} alt={report.title} />
      <div className="detail-content">
        <span className="card-meta">
          <span className={'status-text ' + report.tone}>{report.badge}</span> · {report.category} ·
          Publicado el {report.posted}
        </span>
        <h2 id="detail-title">{report.title}</h2>
        <p>{report.description}</p>
        <p className="card-meta">
          {report.zone}, {report.city} · {report.date} · {report.person}
        </p>
        <div className="detail-actions">
          {canResolve && (
            <button className="primary-button" onClick={onResolve}>
              Marcar como resuelto
            </button>
          )}
          {canContact && (
            <button className="primary-button" onClick={onContact} disabled={view.contacting}>
              {view.contacting && <LoaderCircle size={15} className="spin" />}
              Contactar por WhatsApp
            </button>
          )}
          <button className="secondary-button" onClick={onSave} aria-pressed={saved}>
            {saved ? 'Guardado' : 'Guardar'}
          </button>
        </div>
        {view.contactMessage && (
          <p className="detail-notice" role="status">
            {view.contactMessage}
          </p>
        )}
        <small className="hint">Tu correo no se muestra. Coordina el contacto con cuidado.</small>
      </div>
    </>
  )
}
