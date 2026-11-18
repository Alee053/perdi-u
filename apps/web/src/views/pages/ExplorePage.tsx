import type { Section } from '../../presenters/app/sections'
import type { AppView } from '../../presenters/app/useApp'
import {
  type FilterSelection,
  type FiltersPresenter,
} from '../../presenters/catalog/filters.presenter'
import { CatalogResults } from '../components/CatalogResults'
import { PageHeading } from '../components/PageHeading'
import { ReportFilters } from '../components/ReportFilters'
import { ReportGrid } from '../components/ReportGrid'
import { StatusTabs } from '../components/StatusTabs'

type ExplorePageProps = {
  catalog: AppView['catalog']
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
  onRetry: () => void
  onNavigate: (section: Section) => void
  isSaved: (id: string) => boolean
  onSave: (id: string) => void
  onOpen: (id: string) => void
}

export function ExplorePage({
  catalog,
  selection,
  options,
  filters,
  onRetry,
  onNavigate,
  ...cards
}: ExplorePageProps) {
  return (
    <>
      <PageHeading
        title="Explorar reportes"
        description="Busca por palabra, ciudad, zona, categoría o fecha del hecho."
        action={
          <button className="primary-button" onClick={() => onNavigate('publish')}>
            Publicar reporte
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
        {catalog.status === 'ready' && !selection.dateError && !selection.urlError && (
          <span className="result-count">
            <b>{catalog.count}</b> resultados
          </span>
        )}
      </div>
      <CatalogResults
        result={catalog}
        blocked={Boolean(selection.dateError || selection.urlError)}
        onRetry={onRetry}
        onPublish={() => onNavigate('publish')}
      >
        <ReportGrid reports={catalog.reports} {...cards} />
        <button className="text-button more-link" onClick={() => onNavigate('publish')}>
          ¿No ves lo que buscas? Publica un reporte
        </button>
      </CatalogResults>
    </>
  )
}
