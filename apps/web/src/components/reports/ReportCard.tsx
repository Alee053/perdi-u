import { ArrowRight, ArrowUpRight, Heart, MapPin } from 'lucide-react'
import type { Report } from '../../types'
import { statusColors } from '../../utils/text'

type ReportCardProps = {
  report: Report
  saved: boolean
  onSave: () => void
  onOpen: () => void
  index: number
}

export function ReportCard({ report, saved, onSave, onOpen, index }: ReportCardProps) {
  return (
    <article className="report-card" style={{ animationDelay: Math.min(index, 5) * 60 + 'ms' }}>
      <div className="card-image-wrap">
        <button
          className="card-image-button"
          onClick={onOpen}
          aria-label={'Ver reporte: ' + report.title}
        >
          <img src={report.image} alt="" loading="lazy" />
          <span className={'report-status ' + statusColors[report.status]}>
            <i />
            {report.status}
          </span>
          <span className="card-image-counter">{report.posted}</span>
        </button>
        <button
          className={'save-button ' + (saved ? 'saved' : '')}
          onClick={onSave}
          aria-label={saved ? 'Quitar de guardados' : 'Guardar reporte'}
        >
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="card-content">
        <div className="card-top-meta">
          <span>{report.category}</span>
          <span>
            <i />
            {report.posted}
          </span>
        </div>
        <button className="card-title" onClick={onOpen}>
          {report.title}
        </button>
        <p className="card-description">{report.description}</p>
        <div className="card-location">
          <MapPin size={13} />
          <span>
            {report.zone}, {report.city}
          </span>
          <button onClick={onOpen} aria-label="Ver ubicación aproximada">
            <ArrowUpRight size={13} />
          </button>
        </div>
        <div className="card-footer">
          <span className={'poster-avatar ' + report.color}>{report.initials}</span>
          <span className="poster-name">
            {report.person}
            <small>en PerdiU</small>
          </span>
          <button className="card-contact" onClick={onOpen}>
            Ver detalle <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </article>
  )
}
