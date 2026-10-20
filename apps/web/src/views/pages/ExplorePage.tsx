import type { Section } from '../../presenters/app/sections'
import type { AppView } from '../../presenters/app/useApp'
import {
  filterOptions,
  type FilterSelection,
  type FiltersPresenter,
} from '../../presenters/catalog/filters.presenter'
import { EmptyState } from '../components/EmptyState'
import { PageHeading } from '../components/PageHeading'
import { ReportFilters } from '../components/ReportFilters'
import { ReportGrid } from '../components/ReportGrid'
import { StatusTabs } from '../components/StatusTabs'

type ExplorePageProps = {
  catalog: AppView['catalog']
  selection: FilterSelection
  filters: Pick<FiltersPresenter, 'setSearch' | 'setCity' | 'setCategory' | 'setStatus' | 'reset'>
  onRetry: () => void
  onNavigate: (section: Section) => void
  isSaved: (id: string) => boolean
  onSave: (id: string) => void
  onOpen: (id: string) => void
}

export function ExplorePage({
  catalog,
  selection,
  filters,
  onRetry,
  onNavigate,
  ...cards
}: ExplorePageProps) {
  return (
    <>
      <PageHeading
        title="Explorar reportes"
        description="Busca por palabra, ciudad o categoría."
        action={
          <button className="primary-button" onClick={() => onNavigate('publish')}>
            Publicar reporte
          </button>
        }
      />
      <div className="toolbar">
        <ReportFilters selection={selection} options={filterOptions} actions={filters} />
        <button className="secondary-button" onClick={filters.reset}>
          Limpiar filtros
        </button>
      </div>
      <div className="toolbar toolbar-row">
        <StatusTabs
          label="Estado del reporte"
          options={filterOptions.statuses}
          value={selection.status}
          onChange={filters.setStatus}
        />
        {catalog.status === 'ready' && (
          <span className="result-count">
            <b>{catalog.count}</b> resultados
          </span>
        )}
      </div>
      {catalog.limitReached && (
        <p className="hint" role="status">
          Se muestran hasta {catalog.limit} resultados. Ajusta los filtros para precisar la
          búsqueda.
        </p>
      )}
      {catalog.status === 'loading' && (
        <div className="catalog-state" role="status" aria-live="polite">
          Cargando reportes…
        </div>
      )}
      {catalog.status === 'error' && (
        <div className="catalog-state" role="alert">
          <p>{catalog.message}</p>
          <button className="secondary-button" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      )}
      {catalog.status === 'ready' &&
        (catalog.count === 0 ? (
          <EmptyState
            title={catalog.empty.title}
            description={catalog.empty.description}
            action="Publicar reporte"
            onAction={() => onNavigate('publish')}
          />
        ) : (
          <>
            <ReportGrid reports={catalog.reports} {...cards} />
            <button className="text-button more-link" onClick={() => onNavigate('publish')}>
              ¿No ves lo que buscas? Publica un reporte
            </button>
          </>
        ))}
    </>
  )
}
