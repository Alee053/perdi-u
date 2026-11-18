import type { Section } from '../../presenters/app/sections'
import type { AppView } from '../../presenters/app/useApp'
import { EmptyState } from '../components/EmptyState'
import { PageHeading } from '../components/PageHeading'
import { ReportGrid } from '../components/ReportGrid'

type OverviewPageProps = {
  overview: AppView['overview']
  onRetry: () => void
  onNavigate: (section: Section) => void
  isSaved: (id: string) => boolean
  onSave: (id: string) => void
  onOpen: (id: string) => void
}

export function OverviewPage({ overview, onRetry, onNavigate, ...cards }: OverviewPageProps) {
  return (
    <>
      <PageHeading
        title="Resumen"
        description="Actividad reciente de los reportes de la comunidad."
        action={
          <button className="primary-button" onClick={() => onNavigate('publish')}>
            Nuevo reporte
          </button>
        }
      />
      {overview.status === 'loading' && (
        <p className="catalog-state" role="status">
          Cargando reportes…
        </p>
      )}
      {overview.status === 'error' && (
        <div className="catalog-state" role="alert">
          <p>{overview.message}</p>
          <button className="secondary-button" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      )}
      {overview.status === 'empty' && (
        <EmptyState
          title="Todavía no hay reportes"
          description="Cuando la comunidad publique reportes, aparecerán aquí."
          action="Publicar reporte"
          onAction={() => onNavigate('publish')}
        />
      )}
      {overview.status === 'ready' && (
        <>
          <section className="panel summary" aria-label="Resumen de reportes">
            {overview.limitMessage && (
              <p className="hint" role="status">
                {overview.limitMessage}
              </p>
            )}
            <dl className="metrics">
              {overview.metrics.map((metric) => (
                <div key={metric.label}>
                  <dt>{metric.label}</dt>
                  <dd>{metric.value}</dd>
                </div>
              ))}
            </dl>
            <h2>Reportes activos por ciudad</h2>
            <ul className="city-list">
              {overview.cities.map((row) => (
                <li key={row.city}>
                  {row.city}: <b>{row.count}</b>
                </li>
              ))}
            </ul>
          </section>

          <div className="section-heading">
            <h2>Reportes recientes</h2>
            <button className="text-button" onClick={() => onNavigate('explore')}>
              Explorar reportes
            </button>
          </div>
          <ReportGrid reports={overview.recent} {...cards} />
        </>
      )}

      <p className="hint tip">
        Coordina la devolución en un lugar público y comparte tus datos solo cuando te sientas
        cómodo.{' '}
        <button className="text-button" onClick={() => onNavigate('safety')}>
          Ver recomendaciones
        </button>
      </p>
    </>
  )
}
