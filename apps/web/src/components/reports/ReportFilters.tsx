import { ChevronDown, MapPin, PawPrint } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import type { FilterStatus } from '../../types'

type ReportFiltersProps = {
  city: string
  setCity: Dispatch<SetStateAction<string>>
  category: string
  setCategory: Dispatch<SetStateAction<string>>
  status: FilterStatus
  setStatus: Dispatch<SetStateAction<FilterStatus>>
  compact?: boolean
  showStatus?: boolean
}

export function ReportFilters({
  city,
  setCity,
  category,
  setCategory,
  status,
  setStatus,
  compact = false,
  showStatus = true,
}: ReportFiltersProps) {
  return (
    <>
      <label className="filter-select">
        <MapPin size={15} />
        <select value={city} onChange={(event) => setCity(event.target.value)} aria-label="Ciudad">
          <option>Todas las ciudades</option>
          <option>La Paz</option>
          <option>Cochabamba</option>
          <option>Santa Cruz</option>
        </select>
        <ChevronDown size={13} />
      </label>
      <label className="filter-select">
        <PawPrint size={15} />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Categoría"
        >
          <option>Todas las categorías</option>
          <option>Mascota</option>
          <option>Objeto</option>
          <option>Documentos</option>
        </select>
        <ChevronDown size={13} />
      </label>
      {showStatus && (
        <div
          className={'status-tabs' + (compact ? ' compact' : '')}
          role="tablist"
          aria-label="Estado del reporte"
        >
          {(['Todos', 'Perdido', 'Encontrado'] as FilterStatus[]).map((item) => (
            <button
              key={item}
              className={status === item ? 'selected' : ''}
              aria-selected={status === item}
              role="tab"
              onClick={() => setStatus(item)}
            >
              {compact ? item : item === 'Todos' ? 'Todos' : item + 's'}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
