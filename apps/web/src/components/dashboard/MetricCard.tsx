import type { ReactNode } from 'react'

type MetricCardProps = {
  label: string
  value: number
  change: string
  icon: ReactNode
  tone: string
  trend: string
}

export function MetricCard({ label, value, change, icon, tone, trend }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className={'metric-icon ' + tone}>{icon}</div>
      <span className="metric-trend">{trend}</span>
      <small>{label}</small>
      <strong>{value.toString().padStart(2, '0')}</strong>
      <span className="metric-footnote">{change}</span>
    </article>
  )
}
