import { Heart, MapPin } from 'lucide-react'
import type { ReportCard as ReportCardView } from '../../presenters/reports/report-card'

type ReportCardProps = {
  report: ReportCardView
  saved: boolean
  onSave: () => void
  onOpen: () => void
}

export function ReportCard({ report, saved, onSave, onOpen }: ReportCardProps) {
  return (
    <article className="report-card">
      <div className="card-image">
        <button
          className="card-image-button"
          onClick={onOpen}
          aria-label={'Ver reporte: ' + report.title}
        >
          <img src={report.image} alt="" loading="lazy" />
        </button>
        <span className={'status-badge ' + report.tone}>{report.badge}</span>
        <button
          className={'save-button' + (saved ? ' saved' : '')}
          onClick={onSave}
          aria-label={saved ? 'Quitar de guardados' : 'Guardar reporte'}
        >
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="card-content">
        <span className="card-meta">
          {report.category} · {report.posted}
        </span>
        <button className="card-title" onClick={onOpen}>
          {report.title}
        </button>
        <p className="card-description">{report.description}</p>
        <span className="card-location">
          <MapPin size={13} aria-hidden="true" /> {report.zone}, {report.city}
        </span>
        <div className="card-footer">
          <span className="poster-avatar" aria-hidden="true">
            {report.initials}
          </span>
          <span>{report.person}</span>
          <button className="text-button" onClick={onOpen}>
            Ver detalle
          </button>
        </div>
      </div>
    </article>
  )
}
