import { CheckCircle2, Heart, LockKeyhole, MapPin, MessageCircle, X } from 'lucide-react'
import type { ReportDetailView } from '../../presenters/reports/reports.presenter'

type ReportDetailProps = {
  detail: ReportDetailView
  onSave: () => void
  onContact: () => void
  onResolve: () => void
  onClose: () => void
}

export function ReportDetail({ detail, onSave, onContact, onResolve, onClose }: ReportDetailProps) {
  const { card: report, saved, canContact, canResolve } = detail
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>
        <div className="detail-image">
          <img src={report.image} alt={report.title} />
          <span className={'status-badge ' + report.tone}>{report.badge}</span>
        </div>
        <div className="detail-content">
          <span className="card-meta">
            {report.category} · Publicado el {report.posted}
          </span>
          <h2 id="detail-title">{report.title}</h2>
          <p>{report.description}</p>
          <p className="detail-location">
            <MapPin size={15} aria-hidden="true" />
            {report.zone}, {report.city} · {report.date}
          </p>
          <div className="card-footer">
            <span className="poster-avatar" aria-hidden="true">
              {report.initials}
            </span>
            <span>{report.person}</span>
          </div>
          <div className="detail-actions">
            {canResolve && (
              <button className="primary-button" onClick={onResolve}>
                <CheckCircle2 size={15} /> Marcar como resuelto
              </button>
            )}
            {canContact && (
              <button className="primary-button" onClick={onContact}>
                <MessageCircle size={15} /> Contactar por WhatsApp
              </button>
            )}
            <button className="secondary-button" onClick={onSave} aria-pressed={saved}>
              <Heart size={15} fill={saved ? 'currentColor' : 'none'} />
              {saved ? 'Guardado' : 'Guardar'}
            </button>
          </div>
          <small className="hint">
            <LockKeyhole size={12} aria-hidden="true" /> Tu correo no se muestra. Coordina el
            contacto con cuidado.
          </small>
        </div>
      </div>
    </div>
  )
}
