import type { SyntheticEvent } from 'react'
import type { FilterSelection } from '../../presenters/catalog/filters.presenter'
import { CityInput } from './CityInput'

type FilterActions = {
  setSearch: (value: string) => void
  setCity: (value: string) => void
  setZone: (value: string) => void
  setCategory: (value: string) => void
  setDateFrom: (value: string, invalidInput?: boolean) => void
  setDateTo: (value: string, invalidInput?: boolean) => void
}

type ReportFiltersProps = {
  selection: FilterSelection
  options: { cities: readonly string[]; categories: readonly string[] }
  actions: FilterActions
}

export function ReportFilters({ selection, options, actions }: ReportFiltersProps) {
  const readDateFrom = (event: SyntheticEvent<HTMLInputElement>) =>
    actions.setDateFrom(event.currentTarget.value, event.currentTarget.validity.badInput)
  const readDateTo = (event: SyntheticEvent<HTMLInputElement>) =>
    actions.setDateTo(event.currentTarget.value, event.currentTarget.validity.badInput)

  return (
    <>
      <input
        className="search-field"
        value={selection.search}
        onChange={(event) => actions.setSearch(event.target.value)}
        placeholder="Buscar por nombre o descripción"
        aria-label="Buscar reportes"
        maxLength={200}
      />
      <CityInput
        className="search-field"
        suggestions={options.cities}
        value={selection.city}
        onChange={(event) => actions.setCity(event.target.value)}
        aria-label="Ciudad"
        placeholder="Todas las ciudades"
        maxLength={100}
      />
      <input
        className="search-field"
        value={selection.zone}
        onChange={(event) => actions.setZone(event.target.value)}
        placeholder="Zona o barrio"
        aria-label="Zona o barrio"
        maxLength={200}
      />
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
          key={selection.dateInputRevision}
          className="select-field"
          type="date"
          value={selection.dateFrom ?? ''}
          onChange={readDateFrom}
          onKeyUp={readDateFrom}
          onBlur={readDateFrom}
          aria-label="Desde"
          aria-invalid={Boolean(selection.dateError)}
          aria-describedby={selection.dateError ? 'date-range-error' : undefined}
        />
      </label>
      <label>
        Hasta
        <input
          key={selection.dateInputRevision}
          className="select-field"
          type="date"
          value={selection.dateTo ?? ''}
          onChange={readDateTo}
          onKeyUp={readDateTo}
          onBlur={readDateTo}
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
      {selection.urlError && <p role="alert">{selection.urlError}</p>}
    </>
  )
}
