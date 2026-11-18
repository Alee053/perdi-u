import type { ReactNode } from 'react'
import type { AppView } from '../../presenters/app/useApp'
import { EmptyState } from './EmptyState'

type CatalogResultsProps = {
  result: AppView['catalog'] | AppView['map']
  blocked: boolean
  onRetry: () => void
  onPublish: () => void
  children: ReactNode
}

export function CatalogResults({
  result,
  blocked,
  onRetry,
  onPublish,
  children,
}: CatalogResultsProps) {
  if (blocked) return null
  if (result.status === 'loading')
    return (
      <div className="catalog-state" role="status" aria-live="polite">
        Cargando reportes…
      </div>
    )
  if (result.status === 'error')
    return (
      <div className="catalog-state" role="alert">
        <p>{result.message}</p>
        <button className="secondary-button" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    )
  if (result.count === 0)
    return (
      <EmptyState
        title={result.empty.title}
        description={result.empty.description}
        action="Publicar reporte"
        onAction={onPublish}
      />
    )
  return (
    <>
      {result.limitReached && (
        <p className="hint" role="status">
          Se muestran hasta {result.limit} resultados. Ajusta los filtros para precisar la búsqueda.
        </p>
      )}
      {children}
    </>
  )
}
