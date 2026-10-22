import { Heart } from 'lucide-react'
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
          <span className={'status-text ' + report.tone}>{report.badge}</span> · {report.category} ·{' '}
          {report.posted}
        </span>
        <button className="card-title" onClick={onOpen}>
          {report.title}
        </button>
        <p className="card-description">{report.description}</p>
        {report.petSpecies && <span className="card-meta">Especie: {report.petSpecies}</span>}
        <span className="card-meta">
          {report.zone}, {report.city} · {report.person}
        </span>
      </div>
    </article>
  )
}
