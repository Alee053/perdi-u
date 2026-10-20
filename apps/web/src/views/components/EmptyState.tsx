import { Search } from 'lucide-react'

type EmptyStateProps = {
  title: string
  description: string
  action: string
  onAction: () => void
}

export function EmptyState({ title, description, action, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Search size={20} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
      <button className="secondary-button" onClick={onAction}>
        {action}
      </button>
    </div>
  )
}
