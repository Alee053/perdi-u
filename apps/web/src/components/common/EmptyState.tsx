import { ArrowRight, Search } from 'lucide-react'

type EmptyStateProps = {
  title: string
  description: string
  action: string
  onAction: () => void
}

export function EmptyState({ title, description, action, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Search size={21} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      <button className="secondary-button" onClick={onAction}>
        {action} <ArrowRight size={14} />
      </button>
    </div>
  )
}
