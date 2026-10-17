import { Plus } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import type { FilterStatus, Report, Section } from '../types'
import { EmptyState } from '../components/common/EmptyState'
import { PageHeading } from '../components/common/PageHeading'
import { MapResult, MapView } from '../components/reports/MapView'
import { ReportFilters } from '../components/reports/ReportFilters'

type MapPageProps = {
  reports: Report[]
  city: string
  setCity: Dispatch<SetStateAction<string>>
  category: string
  setCategory: Dispatch<SetStateAction<string>>
  status: FilterStatus
  setStatus: Dispatch<SetStateAction<FilterStatus>>
  onOpen: (report: Report) => void
  onNavigate: (section: Section) => void
}

export function MapPage({
  reports,
  city,
  setCity,
  category,
  setCategory,
  status,
  setStatus,
  onOpen,
  onNavigate,
}: MapPageProps) {
  return (
    <>
      <PageHeading
        eyebrow="REPORTES GEOLOCALIZADOS"
        title="Mapa de reportes"
        description="Ubica reportes cercanos y abre cada punto para ver sus detalles."
        action={
          <button className="primary-button" onClick={() => onNavigate('publish')}>
            <Plus size={16} /> Nuevo reporte
          </button>
        }
      />
      <div className="map-filter-bar">
        <ReportFilters
          city={city}
          setCity={setCity}
          category={category}
          setCategory={setCategory}
          status={status}
          setStatus={setStatus}
          compact
        />
        <span className="map-count">
          <span className="live-dot" /> {reports.length} reportes visibles
        </span>
      </div>
      <div className="map-layout map-page-layout">
        <MapView reports={reports} onOpen={onOpen} />
        <div className="map-side-list">
          <div className="map-side-heading">
            <div>
              <b>Reportes en el mapa</b>
              <small>Selecciona uno para ver detalles</small>
            </div>
            <span>{reports.length}</span>
          </div>
          {reports.slice(0, 7).map((report) => (
            <MapResult key={report.id} report={report} onOpen={() => onOpen(report)} />
          ))}
          {reports.length === 0 && (
            <EmptyState
              title="No hay reportes en esta zona"
              description="Cambia los filtros o crea un reporte nuevo."
              action="Publicar reporte"
              onAction={() => onNavigate('publish')}
            />
          )}
        </div>
      </div>
    </>
  )
}
