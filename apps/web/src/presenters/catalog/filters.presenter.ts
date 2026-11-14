import type { ReportCategory } from '@perdiu/contracts'
import { validateDateRange, type DateRangeError } from '../../models/reports/filters.js'
import { cities } from '../../models/reports/report.js'
import type { ReportFilters } from '../../models/reports/filters.js'
import { categoryLabels } from '../reports/report-card.js'
import { Store } from '../store.js'

/** Selection shown by the controls; the values are the labels the person sees. */
export interface FilterSelection {
  search: string
  city: string
  category: string
  status: 'Todos' | 'Perdido' | 'Encontrado'
  dateFrom?: string
  dateTo?: string
  dateError?:
    | 'La fecha «Desde» debe ser anterior o igual a «Hasta».'
    | 'Indica fechas válidas para el periodo.'
}

export const allCities = 'Todas las ciudades'
export const allCategories = 'Todas las categorías'
export const defaultSelection: FilterSelection = {
  search: '',
  city: allCities,
  category: allCategories,
  status: 'Todos',
  dateFrom: '',
  dateTo: '',
}
export const filterOptions = {
  cities: [allCities, ...cities],
  categories: [allCategories, ...Object.values(categoryLabels)],
  statuses: [
    { value: 'Todos', label: 'Todos' },
    { value: 'Perdido', label: 'Perdidos' },
    { value: 'Encontrado', label: 'Encontrados' },
  ] as const,
}

const categoryValues = Object.fromEntries(
  Object.entries(categoryLabels).map(([value, label]) => [label, value]),
) as Partial<Record<string, ReportCategory>>

const dateRangeMessages: Record<DateRangeError, NonNullable<FilterSelection['dateError']>> = {
  invalid_date: 'Indica fechas válidas para el periodo.',
  range_order: 'La fecha «Desde» debe ser anterior o igual a «Hasta».',
}

/** Translates the visible selection into the model's search criteria. */
export function toReportFilters(selection: FilterSelection): ReportFilters {
  const category = categoryValues[selection.category]
  return {
    text: selection.search,
    ...(selection.city !== allCities ? { city: selection.city } : {}),
    ...(category ? { category } : {}),
    ...(selection.status !== 'Todos'
      ? { type: selection.status === 'Perdido' ? ('lost' as const) : ('found' as const) }
      : {}),
    ...(selection.dateFrom ? { dateFrom: selection.dateFrom } : {}),
    ...(selection.dateTo ? { dateTo: selection.dateTo } : {}),
  }
}

/**
 * Search controls shared by the catalog and the map. Every change is announced so the catalog can
 * query the API again.
 */
export class FiltersPresenter extends Store<FilterSelection> {
  constructor(private readonly onChange: (selection: FilterSelection) => void = () => {}) {
    super(defaultSelection)
  }

  private update(patch: Partial<FilterSelection>) {
    const next = { ...this.state, ...patch }
    const dateError = validateDateRange(next.dateFrom, next.dateTo)
    if (dateError) next.dateError = dateRangeMessages[dateError]
    else delete next.dateError
    this.setState(next)
    this.onChange(this.state)
  }

  setSearch = (search: string) => this.update({ search })
  setCity = (city: string) => this.update({ city })
  setCategory = (category: string) => this.update({ category })
  setStatus = (status: FilterSelection['status']) => this.update({ status })
  setDateFrom = (dateFrom: string) => this.update({ dateFrom })
  setDateTo = (dateTo: string) => this.update({ dateTo })
  reset = () => this.update(defaultSelection)
}
