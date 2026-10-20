import type { Section } from '../../presenters/app/sections'
import type { ReportCard } from '../../presenters/reports/report-card'
import { EmptyState } from '../components/EmptyState'
import { PageHeading } from '../components/PageHeading'
import { ReportGrid } from '../components/ReportGrid'

type SavedPageProps = {
  reports: ReportCard[]
  onNavigate: (section: Section) => void
  isSaved: (id: string) => boolean
  onSave: (id: string) => void
  onOpen: (id: string) => void
}

export function SavedPage({ reports, onNavigate, ...cards }: SavedPageProps) {
  return (
    <>
      <PageHeading
        title="Reportes guardados"
        description="Publicaciones que quieres revisar o seguir más tarde en este dispositivo."
      />
      {reports.length ? (
        <ReportGrid reports={reports} {...cards} />
      ) : (
        <EmptyState
          title="Tu lista está vacía por ahora"
          description="Guarda reportes con el ícono de corazón y aparecerán aquí."
          action="Explorar reportes"
          onAction={() => onNavigate('explore')}
        />
      )}
    </>
  )
}
