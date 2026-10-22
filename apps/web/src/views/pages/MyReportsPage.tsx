import type { Section } from '../../presenters/app/sections'
import type { AppView } from '../../presenters/app/useApp'
import type { OwnFilter } from '../../presenters/reports/own-reports.presenter'
import { EmptyState } from '../components/EmptyState'
import { PageHeading } from '../components/PageHeading'
import { StatusTabs } from '../components/StatusTabs'
import { ReportPhoto } from '../components/ReportPhoto'

type MyReportsPageProps = {
  myReports: AppView['myReports']
  onFilter: (filter: OwnFilter) => void
  onResolve: (id: string) => void
  onRetry: () => void
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
  onRetry,
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
            Nuevo reporte
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
      {(myReports.status === 'idle' || myReports.status === 'loading') && (
        <p className="catalog-state" role="status">
          Cargando tus reportes…
        </p>
      )}
      {myReports.status === 'error' && (
        <div className="catalog-state" role="alert">
          <p>{myReports.message}</p>
          <button className="secondary-button" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      )}
      {myReports.status === 'ready' && (
        <div className="managed-list">
          {myReports.cards.map((report) => (
            <article className="managed-report" key={report.id}>
              <button
                className="managed-image"
                aria-label={'Ver ' + report.title}
                onClick={() => onOpen(report.id)}
              >
                <ReportPhoto src={report.image} privatePhoto={report.resolved} alt="" />
              </button>
              <div>
                <span className="card-meta">
                  <span className={'status-text ' + report.tone}>{report.status}</span> ·{' '}
                  {report.stateLabel} · {report.category} · {report.posted}
                </span>
                <button className="card-title" onClick={() => onOpen(report.id)}>
                  {report.title}
                </button>
                <p className="card-description">{report.description}</p>
                <span className="card-meta">
                  {report.zone}, {report.city}
                </span>
              </div>
              <div className="managed-actions">
                {!report.resolved && (
                  <button className="secondary-button" onClick={() => onResolve(report.id)}>
                    Marcar como resuelto
                  </button>
                )}
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
      )}
    </>
  )
}
