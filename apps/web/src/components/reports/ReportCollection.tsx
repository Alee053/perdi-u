import { ArrowRight } from 'lucide-react'
import type { Report, Section } from '../../types'
import { EmptyState } from '../common/EmptyState'
import { ReportCard } from './ReportCard'

type ReportCollectionProps = {
  reports: Report[]
  saved: string[]
  onSave: (id: string) => void
  onOpen: (report: Report) => void
  onNavigate: (section: Section) => void
  onClear: () => void
  emptyCopy: string
  emptyTitle?: string
}

export function ReportCollection({
  reports,
  saved,
  onSave,
  onOpen,
  onNavigate,
  onClear,
  emptyCopy,
  emptyTitle = 'No encontramos reportes',
}: ReportCollectionProps) {
  if (!reports.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyCopy}
        action="Limpiar filtros"
        onAction={onClear}
      />
    )
  }

  return (
    <>
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
      <button className="load-more" onClick={() => onNavigate('publish')}>
        ¿No ves lo que buscas? Publica un reporte <ArrowRight size={14} />
      </button>
    </>
  )
}
