import type { Section } from '../../presenters/app/sections'
import type { ReportCard } from '../../presenters/reports/report-card'
import { EmptyState } from '../components/EmptyState'
import { PageHeading } from '../components/PageHeading'
import { ReportGrid } from '../components/ReportGrid'

type SavedPageProps = {
  reports: ReportCard[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  message: string | null
  onNavigate: (section: Section) => void
  onRetry: () => void
  isSaved: (id: string) => boolean
  onSave: (id: string) => void
  onOpen: (id: string) => void
}

export function SavedPage({
  reports,
  status,
  message,
  onNavigate,
  onRetry,
  ...cards
}: SavedPageProps) {
  return (
    <>
      <PageHeading
        title="Reportes guardados"
        description="Publicaciones que quieres revisar o seguir más tarde en este dispositivo."
      />
      {(status === 'idle' || status === 'loading') && (
        <p className="catalog-state" role="status">
          Verificando tus reportes guardados…
        </p>
      )}
      {status === 'error' && (
        <div className="catalog-state" role="alert">
          <p>{message}</p>
          <button className="text-button" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      )}
      {reports.length ? (
        <ReportGrid reports={reports} {...cards} />
      ) : status === 'ready' ? (
        <EmptyState
          title="Tu lista está vacía por ahora"
          description="Guarda reportes con el ícono de corazón y aparecerán aquí."
          action="Explorar reportes"
          onAction={() => onNavigate('explore')}
        />
      ) : null}
    </>
  )
}
