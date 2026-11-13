import type { FilterSelection } from '../../presenters/catalog/filters.presenter'

type FilterActions = {
  setSearch: (value: string) => void
  setCity: (value: string) => void
  setCategory: (value: string) => void
  setDateFrom: (value: string) => void
  setDateTo: (value: string) => void
}

type ReportFiltersProps = {
  selection: FilterSelection
  options: { cities: readonly string[]; categories: readonly string[] }
  actions: FilterActions
  /** The map filters by place and category only. */
  withSearch?: boolean
}

export function ReportFilters({
  selection,
  options,
  actions,
  withSearch = true,
}: ReportFiltersProps) {
  return (
    <>
      {withSearch && (
        <input
          className="search-field"
          value={selection.search}
          onChange={(event) => actions.setSearch(event.target.value)}
          placeholder="Buscar por nombre o descripción"
          aria-label="Buscar reportes"
          maxLength={200}
        />
      )}
      <select
        className="select-field"
        value={selection.city}
        onChange={(event) => actions.setCity(event.target.value)}
        aria-label="Ciudad"
      >
        {options.cities.map((city) => (
          <option key={city}>{city}</option>
        ))}
      </select>
      <select
        className="select-field"
        value={selection.category}
        onChange={(event) => actions.setCategory(event.target.value)}
        aria-label="Categoría"
      >
        {options.categories.map((category) => (
          <option key={category}>{category}</option>
        ))}
      </select>
      <label>
        Desde
        <input
          className="select-field"
          type="date"
          value={selection.dateFrom ?? ''}
          onChange={(event) => actions.setDateFrom(event.target.value)}
          aria-label="Desde"
          aria-invalid={Boolean(selection.dateError)}
          aria-describedby={selection.dateError ? 'date-range-error' : undefined}
        />
      </label>
      <label>
        Hasta
        <input
          className="select-field"
          type="date"
          value={selection.dateTo ?? ''}
          onChange={(event) => actions.setDateTo(event.target.value)}
          aria-label="Hasta"
          aria-invalid={Boolean(selection.dateError)}
          aria-describedby={selection.dateError ? 'date-range-error' : undefined}
        />
      </label>
      {selection.dateError && (
        <p id="date-range-error" role="alert">
          {selection.dateError}
        </p>
      )}
    </>
  )
}
