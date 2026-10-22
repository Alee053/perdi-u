import { X } from 'lucide-react'
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
        <img className="detail-image" src={report.image} alt={report.title} />
        <div className="detail-content">
          <span className="card-meta">
            <span className={'status-text ' + report.tone}>{report.badge}</span> · {report.category}{' '}
            · Publicado el {report.posted}
          </span>
          <h2 id="detail-title">{report.title}</h2>
          {report.petSpecies && <p className="card-meta">Especie: {report.petSpecies}</p>}
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
              <button className="primary-button" onClick={onContact}>
                Contactar por WhatsApp
              </button>
            )}
            <button className="secondary-button" onClick={onSave} aria-pressed={saved}>
              {saved ? 'Guardado' : 'Guardar'}
            </button>
          </div>
          <small className="hint">Tu correo no se muestra. Coordina el contacto con cuidado.</small>
        </div>
      </div>
    </div>
  )
}
