import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Heart,
  Plus,
  Search,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import type { Report, Section } from '../types'
import { MetricCard } from '../components/dashboard/MetricCard'
import { PageHeading } from '../components/common/PageHeading'
import { ReportCard } from '../components/reports/ReportCard'

type OverviewPageProps = {
  reports: Report[]
  lostCount: number
  foundCount: number
  resolvedCount: number
  ownCount: number
  saved: string[]
  onNavigate: (section: Section) => void
  onOpen: (report: Report) => void
  onSave: (id: string) => void
}

export function OverviewPage({
  reports,
  lostCount,
  foundCount,
  resolvedCount,
  ownCount,
  saved,
  onNavigate,
  onOpen,
  onSave,
}: OverviewPageProps) {
  const todayLabel = new Intl.DateTimeFormat('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(new Date())
    .toLocaleUpperCase('es')

  return (
    <>
      <PageHeading
        eyebrow={todayLabel}
        title="Resumen"
        description="Hola, Santiago. Aquí tienes la actividad reciente de la comunidad."
        action={
          <button className="primary-button" onClick={() => onNavigate('publish')}>
            <Plus size={16} /> Nuevo reporte
          </button>
        }
      />
      <section className="metric-grid" aria-label="Resumen de reportes">
        <MetricCard
          label="Reportes activos"
          value={reports.length}
          change="en la comunidad"
          icon={<Activity size={17} />}
          tone="green"
          trend="+12%"
        />
        <MetricCard
          label="Objetos perdidos"
          value={lostCount}
          change="necesitan una mano"
          icon={<Search size={17} />}
          tone="orange"
          trend="En curso"
        />
        <MetricCard
          label="Encontrados"
          value={foundCount}
          change="esperan a su persona"
          icon={<Heart size={17} />}
          tone="blue"
          trend="En comunidad"
        />
        <MetricCard
          label="Reencuentros"
          value={resolvedCount}
          change="casos resueltos"
          icon={<CheckCircle2 size={17} />}
          tone="violet"
          trend={ownCount ? ownCount + ' tuyo' + (ownCount > 1 ? 's' : '') : 'Buen comienzo'}
        />
      </section>

      <section className="overview-main-grid">
        <div className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-eyebrow">MOVIMIENTO EN PERDIU</span>
              <h2>Actividad de reportes</h2>
            </div>
            <button className="select-button">
              <CalendarDays size={14} /> Últimos 7 días <ChevronDown size={13} />
            </button>
          </div>
          <div className="chart-summary">
            <b>{reports.length}</b>
            <span>reportes activos</span>
            <span className="chart-trend">
              <TrendingUp size={13} /> 12% <small>esta semana</small>
            </span>
          </div>
          <div className="activity-chart" aria-label="Actividad semanal ilustrativa">
            {(
              [
                ['Lun', 36, 20],
                ['Mar', 52, 27],
                ['Mié', 43, 30],
                ['Jue', 66, 34],
                ['Vie', 58, 25],
                ['Sáb', 79, 39],
                ['Dom', 50, 29],
              ] as [string, number, number][]
            ).map(([day, lost, found]) => (
              <div className="chart-day" key={day}>
                <div className="bar-stack">
                  <i style={{ height: lost + '%' }} />
                  <i style={{ height: found + '%' }} />
                </div>
                <small>{day}</small>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-lost" /> Perdidos
            </span>
            <span>
              <i className="legend-found" /> Encontrados
            </span>
            <span className="chart-caption">Datos de demostración</span>
          </div>
        </div>
        <div className="panel community-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-eyebrow">CERCA DE TI</span>
              <h2>Por ciudad</h2>
            </div>
            <button className="icon-quiet" aria-label="Ver mapa" onClick={() => onNavigate('map')}>
              <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="city-list">
            <CityRow
              name="La Paz"
              count={reports.filter((report) => report.city === 'La Paz').length}
              width="76%"
              tone="city-green"
            />
            <CityRow
              name="Cochabamba"
              count={reports.filter((report) => report.city === 'Cochabamba').length}
              width="54%"
              tone="city-orange"
            />
            <CityRow
              name="Santa Cruz"
              count={reports.filter((report) => report.city === 'Santa Cruz').length}
              width="35%"
              tone="city-blue"
            />
            <CityRow name="Otras ciudades" count={0} width="15%" tone="city-violet" />
          </div>
          <button className="panel-text-link" onClick={() => onNavigate('map')}>
            Explorar mapa de Bolivia <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <div className="section-row-heading">
        <div>
          <span className="panel-eyebrow">LO ÚLTIMO</span>
          <h2>Reportes recientes</h2>
          <p>Lo que la comunidad está buscando y encontrando.</p>
        </div>
        <button className="subtle-button" onClick={() => onNavigate('explore')}>
          Ver todos <ArrowRight size={14} />
        </button>
      </div>
      <div className="report-grid dashboard-report-grid">
        {reports.slice(0, 3).map((report, index) => (
          <ReportCard
            key={report.id}
            report={report}
            saved={saved.includes(report.id)}
            onSave={() => onSave(report.id)}
            onOpen={() => onOpen(report)}
            index={index}
          />
        ))}
      </div>
      <div className="dashboard-tip">
        <span className="tip-icon">
          <ShieldCheck size={18} />
        </span>
        <span>
          <b>Un recordatorio para cuidarte</b>
          <small>
            Coordina la devolución en un lugar público y comparte tus datos solo cuando te sientas
            cómodo.
          </small>
        </span>
        <button onClick={() => onNavigate('safety')}>
          Ver recomendaciones <ArrowRight size={14} />
        </button>
      </div>
    </>
  )
}

function CityRow({
  name,
  count,
  width,
  tone,
}: {
  name: string
  count: number
  width: string
  tone: string
}) {
  return (
    <div className="city-row">
      <div>
        <span>{name}</span>
        <b>{count.toString().padStart(2, '0')}</b>
      </div>
      <div className="city-progress">
        <i className={tone} style={{ width }} />
      </div>
    </div>
  )
}
