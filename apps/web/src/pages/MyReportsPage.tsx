import { CheckCircle2, Clock3, FileText, MapPin, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Report, Section } from '../types'
import { statusColors } from '../utils/text'
import { EmptyState } from '../components/common/EmptyState'
import { PageHeading } from '../components/common/PageHeading'

type MyReportsPageProps = {
  reports: Report[]
  onResolve: (report: Report) => void
  onRemove: (report: Report) => void
  onOpen: (report: Report) => void
  onNavigate: (section: Section) => void
}

export function MyReportsPage({
  reports,
  onResolve,
  onRemove,
  onOpen,
  onNavigate,
}: MyReportsPageProps) {
  const [filter, setFilter] = useState<'Todos' | 'Activos' | 'Resueltos'>('Todos')
  const visible = reports.filter(
    (report) => filter === 'Todos' || (filter === 'Resueltos' ? report.resolved : !report.resolved),
  )

  return (
    <>
      <PageHeading
        eyebrow="TU ACTIVIDAD"
        title="Mis reportes"
        description="Administra tus publicaciones y marca como resuelto lo que ya encontraste."
        action={
          <button className="primary-button" onClick={() => onNavigate('publish')}>
            <Plus size={16} /> Nuevo reporte
          </button>
        }
      />
      <div className="my-reports-summary">
        <span className="own-summary-icon">
          <FileText size={18} />
        </span>
        <span>
          <b>
            {reports.length} {reports.length === 1 ? 'reporte publicado' : 'reportes publicados'}
          </b>
          <small>Solo tú puedes gestionar el estado de tus reportes.</small>
        </span>
        <span className="own-summary-count">
          <b>{reports.filter((report) => !report.resolved).length}</b>
          <small>activos</small>
        </span>
      </div>
      <div className="catalog-toolbar own-toolbar">
        <div className="status-tabs" role="tablist">
          {(['Todos', 'Activos', 'Resueltos'] as const).map((item) => (
            <button
              key={item}
              className={filter === item ? 'selected' : ''}
              role="tab"
              aria-selected={filter === item}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <span className="catalog-result-count">{visible.length} resultados</span>
      </div>
      <div className="managed-reports">
        {visible.map((report) => (
          <article className="managed-report" key={report.id}>
            <button className="managed-image" onClick={() => onOpen(report)}>
              <img src={report.image} alt="" />
            </button>
            <div className="managed-main">
              <div className="managed-overline">
                <span className={'status-pill ' + statusColors[report.status]}>
                  <i />
                  {report.resolved ? 'Resuelto' : report.status}
                </span>
                <span>{report.category}</span>
                <span>
                  <Clock3 size={12} /> {report.posted}
                </span>
              </div>
              <button className="managed-title" onClick={() => onOpen(report)}>
                {report.title}
              </button>
              <p>{report.description}</p>
              <span className="managed-location">
                <MapPin size={13} /> {report.zone}, {report.city}
              </span>
            </div>
            <div className="managed-actions">
              {!report.resolved && (
                <button className="resolve-button" onClick={() => onResolve(report)}>
                  <CheckCircle2 size={15} /> Marcar resuelto
                </button>
              )}
              <button
                className="icon-danger"
                onClick={() => onRemove(report)}
                aria-label="Eliminar reporte"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
        {visible.length === 0 && (
          <EmptyState
            title={
              filter === 'Resueltos'
                ? 'Todavía no tienes reportes resueltos'
                : 'Aún no publicaste reportes'
            }
            description="Cuando publiques algo, podrás seguirlo y gestionarlo desde aquí."
            action="Publicar mi primer reporte"
            onAction={() => onNavigate('publish')}
          />
        )}
      </div>
    </>
  )
}
