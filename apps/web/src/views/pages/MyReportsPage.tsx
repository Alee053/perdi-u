import { CheckCircle2, MapPin, Plus, Trash2 } from 'lucide-react'
import type { Section } from '../../presenters/app/sections'
import type { AppView } from '../../presenters/app/useApp'
import type { OwnFilter } from '../../presenters/reports/reports.presenter'
import { EmptyState } from '../components/EmptyState'
import { PageHeading } from '../components/PageHeading'
import { StatusTabs } from '../components/StatusTabs'

type MyReportsPageProps = {
  myReports: AppView['myReports']
  onFilter: (filter: OwnFilter) => void
  onResolve: (id: string) => void
  onRemove: (id: string) => void
  onOpen: (id: string) => void
  onNavigate: (section: Section) => void
}

const filters = [
  { value: 'Todos', label: 'Todos' },
  { value: 'Activos', label: 'Activos' },
  { value: 'Resueltos', label: 'Resueltos' },
] as const

export function MyReportsPage({
  myReports,
  onFilter,
  onResolve,
  onRemove,
  onOpen,
  onNavigate,
}: MyReportsPageProps) {
  return (
    <>
      <PageHeading
        title="Mis reportes"
        description={`${myReports.total} publicados · ${myReports.active} activos. Solo tú puedes cambiar su estado.`}
        action={
          <button className="primary-button" onClick={() => onNavigate('publish')}>
            <Plus size={16} /> Nuevo reporte
          </button>
        }
      />
      <div className="toolbar toolbar-row">
        <StatusTabs
          label="Estado de mis reportes"
          options={filters}
          value={myReports.filter}
          onChange={onFilter}
        />
        <span className="result-count">
          <b>{myReports.cards.length}</b> resultados
        </span>
      </div>
      <div className="managed-list">
        {myReports.cards.map((report) => (
          <article className="managed-report" key={report.id}>
            <button className="managed-image" onClick={() => onOpen(report.id)}>
              <img src={report.image} alt="" />
            </button>
            <div>
              <span className="card-meta">
                <span className={'status-badge inline ' + report.tone}>{report.badge}</span>
                {report.category} · {report.posted}
              </span>
              <button className="card-title" onClick={() => onOpen(report.id)}>
                {report.title}
              </button>
              <p className="card-description">{report.description}</p>
              <span className="card-location">
                <MapPin size={13} aria-hidden="true" /> {report.zone}, {report.city}
              </span>
            </div>
            <div className="managed-actions">
              {!report.resolved && (
                <button className="secondary-button" onClick={() => onResolve(report.id)}>
                  <CheckCircle2 size={15} /> Marcar resuelto
                </button>
              )}
              <button
                className="icon-button danger"
                onClick={() => onRemove(report.id)}
                aria-label="Eliminar reporte"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
        {myReports.cards.length === 0 && (
          <EmptyState
            title={myReports.empty.title}
            description="Cuando publiques algo, podrás seguirlo y gestionarlo desde aquí."
            action="Publicar mi primer reporte"
            onAction={() => onNavigate('publish')}
          />
        )}
      </div>
    </>
  )
}
