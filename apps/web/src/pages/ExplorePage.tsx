import { Plus, SlidersHorizontal } from 'lucide-react'
import { REPORT_RESULT_LIMIT } from '@perdiu/contracts'
import type { Dispatch, SetStateAction } from 'react'
import type { FilterStatus, Report, Section } from '../types'
import type { CatalogState } from '../catalog/presenter'
import { EmptyState } from '../components/common/EmptyState'
import { PageHeading } from '../components/common/PageHeading'
import { ReportCollection } from '../components/reports/ReportCollection'
import { ReportFilters } from '../components/reports/ReportFilters'
import { ReportSearch } from '../components/reports/ReportSearch'

type ExplorePageProps = {
  reports: Report[]
  catalogState: CatalogState
  onRetry: () => void
  search: string
  setSearch: (value: string) => void
  city: string
  setCity: Dispatch<SetStateAction<string>>
  category: string
  setCategory: Dispatch<SetStateAction<string>>
  status: FilterStatus
  setStatus: Dispatch<SetStateAction<FilterStatus>>
  resetFilters: () => void
  onOpen: (report: Report) => void
  saved: string[]
  onSave: (id: string) => void
  onNavigate: (section: Section) => void
}

export function ExplorePage({
  reports,
  catalogState,
  onRetry,
  search,
  setSearch,
  city,
  setCity,
  category,
  setCategory,
  status,
  setStatus,
  resetFilters,
  onOpen,
  saved,
  onSave,
  onNavigate,
}: ExplorePageProps) {
  const hasFilters =
    Boolean(search.trim()) ||
    city !== 'Todas las ciudades' ||
    category !== 'Todas las categorías' ||
    status !== 'Todos'
  return (
    <>
      <PageHeading
        eyebrow="CATÁLOGO DE LA COMUNIDAD"
        title="Explorar reportes"
        description="Busca por palabra, ciudad o categoría para encontrar lo que necesitas."
        action={
          <button className="primary-button" onClick={() => onNavigate('publish')}>
            <Plus size={16} /> Publicar reporte
          </button>
        }
      />
      <div className="explore-toolbar">
        <ReportSearch value={search} onChange={setSearch} />
        <ReportFilters
          city={city}
          setCity={setCity}
          category={category}
          setCategory={setCategory}
          status={status}
          setStatus={setStatus}
          showStatus={false}
        />
        <button className="filter-reset" onClick={resetFilters}>
          <SlidersHorizontal size={15} /> Limpiar filtros
        </button>
      </div>
      {catalogState.status === 'ready' && reports.length === REPORT_RESULT_LIMIT && (
        <p role="status">
          Se muestran hasta {REPORT_RESULT_LIMIT} resultados. Ajusta los filtros para precisar la
          búsqueda.
        </p>
      )}
      <div className="catalog-toolbar">
        <div className="status-tabs" role="tablist" aria-label="Estado del reporte">
          {(['Todos', 'Perdido', 'Encontrado'] as FilterStatus[]).map((item) => (
            <button
              key={item}
              className={status === item ? 'selected' : ''}
              aria-selected={status === item}
              role="tab"
              onClick={() => setStatus(item)}
            >
              {item === 'Todos' ? 'Todos' : item + 's'}
            </button>
          ))}
        </div>
        {catalogState.status === 'ready' && (
          <div className="catalog-meta">
            <span>
              <b>{reports.length}</b> resultados
            </span>
          </div>
        )}
      </div>
      {catalogState.status === 'loading' && (
        <div className="catalog-state" role="status" aria-live="polite">
          Cargando reportes…
        </div>
      )}
      {catalogState.status === 'error' && (
        <div className="catalog-state" role="alert">
          <p>{catalogState.message}</p>
          <button className="secondary-button" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      )}
      {catalogState.status === 'ready' &&
        (catalogState.reports.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No se encontraron coincidencias' : 'Todavía no hay reportes'}
            description={
              hasFilters
                ? 'Prueba con otra búsqueda o publica un reporte.'
                : 'Cuando la comunidad publique reportes, aparecerán aquí.'
            }
            action="Publicar reporte"
            onAction={() => onNavigate('publish')}
          />
        ) : (
          <ReportCollection
            reports={reports}
            saved={saved}
            onSave={onSave}
            onOpen={onOpen}
            onNavigate={onNavigate}
            onClear={resetFilters}
            emptyCopy="Prueba con otra búsqueda o cambia los filtros."
            emptyTitle={
              search.trim() ? 'No se encontraron coincidencias' : 'No encontramos reportes'
            }
          />
        ))}
    </>
  )
}
