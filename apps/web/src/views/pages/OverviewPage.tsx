import type { Section } from '../../presenters/app/sections'
import type { AppView } from '../../presenters/app/useApp'
import { PageHeading } from '../components/PageHeading'
import { ReportGrid } from '../components/ReportGrid'

type OverviewPageProps = {
  overview: AppView['overview']
  onNavigate: (section: Section) => void
  isSaved: (id: string) => boolean
  onSave: (id: string) => void
  onOpen: (id: string) => void
}

export function OverviewPage({ overview, onNavigate, ...cards }: OverviewPageProps) {
  return (
    <>
      <PageHeading
        title="Resumen"
        description="Actividad de los reportes de demostración de la comunidad."
        action={
          <button className="primary-button" onClick={() => onNavigate('publish')}>
            Nuevo reporte
          </button>
        }
      />
      <section className="panel summary" aria-label="Resumen de reportes">
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
          Ver todos
        </button>
      </div>
      <ReportGrid reports={overview.recent} {...cards} />

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
