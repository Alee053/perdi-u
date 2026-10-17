import { Bookmark } from 'lucide-react'
import type { Report, Section } from '../types'
import { EmptyState } from '../components/common/EmptyState'
import { PageHeading } from '../components/common/PageHeading'
import { ReportCard } from '../components/reports/ReportCard'

type SavedPageProps = {
  reports: Report[]
  onSave: (id: string) => void
  onOpen: (report: Report) => void
  onNavigate: (section: Section) => void
  saved: string[]
}

export function SavedPage({ reports, onSave, onOpen, onNavigate, saved }: SavedPageProps) {
  return (
    <>
      <PageHeading
        eyebrow="TU LISTA PERSONAL"
        title="Reportes guardados"
        description="Ten a mano las publicaciones que quieres revisar o seguir más tarde."
      />
      {reports.length ? (
        <>
          <div className="saved-intro">
            <Bookmark size={17} />
            <span>
              {reports.length} {reports.length === 1 ? 'reporte guardado' : 'reportes guardados'}
            </span>
          </div>
          <div className="report-grid">
            {reports.map((report, index) => (
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
        </>
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
