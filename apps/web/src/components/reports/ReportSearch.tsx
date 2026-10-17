import { Search } from 'lucide-react'

type ReportSearchProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function ReportSearch({
  value,
  onChange,
  placeholder = 'Buscar por nombre o descripción...',
}: ReportSearchProps) {
  return (
    <label className="explore-search">
      <Search size={17} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Buscar reportes"
        maxLength={200}
      />
      <kbd>⌘ K</kbd>
    </label>
  )
}
