import type { Section } from '../../presenters/app/sections'
import type { AppView } from '../../presenters/app/useApp'
import {
  type FilterSelection,
  type FiltersPresenter,
} from '../../presenters/catalog/filters.presenter'
import { CatalogResults } from '../components/CatalogResults'
import { PageHeading } from '../components/PageHeading'
import { ReportFilters } from '../components/ReportFilters'
import { StatusTabs } from '../components/StatusTabs'

type MapPageProps = {
  map: AppView['map']
  selection: FilterSelection
  options: AppView['filterOptions']
  filters: Pick<
    FiltersPresenter,
    | 'setSearch'
    | 'setCity'
    | 'setZone'
    | 'setCategory'
    | 'setStatus'
    | 'setDateFrom'
    | 'setDateTo'
    | 'reset'
  >
  onOpen: (id: string) => void
  onRetry: () => void
  onNavigate: (section: Section) => void
}

export function MapPage({
  map,
  selection,
  options,
  filters,
  onOpen,
  onRetry,
  onNavigate,
}: MapPageProps) {
  return (
    <>
      <PageHeading
        title="Mapa de reportes"
        description="Consulta la ciudad y zona declaradas en cada reporte."
        action={
          <button className="primary-button" onClick={() => onNavigate('publish')}>
            Nuevo reporte
          </button>
        }
      />
      <div className="toolbar">
        <ReportFilters selection={selection} options={options} actions={filters} />
        <button className="secondary-button" onClick={filters.reset}>
          Limpiar filtros
        </button>
      </div>
      <div className="toolbar toolbar-row">
        <StatusTabs
          label="Estado del reporte"
          options={options.statuses}
          value={selection.status}
          onChange={filters.setStatus}
        />
        {map.status === 'ready' && !selection.dateError && !selection.urlError && (
          <span className="result-count">
            <b>{map.count}</b> reportes visibles
          </span>
        )}
      </div>
      <CatalogResults
        result={map}
        blocked={Boolean(selection.dateError || selection.urlError)}
        onRetry={onRetry}
        onPublish={() => onNavigate('publish')}
      >
        <ul className="map-list" aria-label="Ubicaciones reportadas">
          {map.list.map((report) => (
            <li key={report.id}>
              <button className="map-result" onClick={() => onOpen(report.id)}>
                <b>{report.title}</b>
                <small>
                  {report.status} · {report.category}
                </small>
                <span>
                  {report.city} · {report.zone}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </CatalogResults>
    </>
  )
}
