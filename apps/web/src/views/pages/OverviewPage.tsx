import { Plus, ShieldCheck } from 'lucide-react'
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
            <Plus size={16} /> Nuevo reporte
          </button>
        }
      />
      <section className="metrics" aria-label="Resumen de reportes">
        {overview.metrics.map((metric) => (
          <div className="metric" key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Por ciudad</h2>
          <button className="text-button" onClick={() => onNavigate('map')}>
            Ver mapa
          </button>
        </div>
        <ul className="city-list">
          {overview.cities.map((row) => (
            <li key={row.city}>
              <span>{row.city}</span>
              <span className="city-bar" aria-hidden="true">
                <i style={{ width: row.share + '%' }} />
              </span>
              <b>{row.count}</b>
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

      <p className="tip">
        <ShieldCheck size={17} aria-hidden="true" />
        <span>
          Coordina la devolución en un lugar público y comparte tus datos solo cuando te sientas
          cómodo.{' '}
          <button className="text-button" onClick={() => onNavigate('safety')}>
            Ver recomendaciones
          </button>
        </span>
      </p>
    </>
  )
}
