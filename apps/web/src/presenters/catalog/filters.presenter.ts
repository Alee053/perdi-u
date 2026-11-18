import type { ReportCategory, ReportQuery } from '@perdiu/contracts'
import { validateDateRange, type DateRangeError } from '../../models/reports/filters.js'
import { cities } from '../../models/reports/report.js'
import type { ReportFilters } from '../../models/reports/filters.js'
import { categoryLabels } from '../reports/report-card.js'
import { Store } from '../store.js'

/** Selection shown by the controls; the values are the labels the person sees. */
export interface FilterSelection {
  urlError?: string
  search: string
  /** Editable city. An empty field represents all cities. */
  city: string
  zone: string
  category: string
  status: 'Todos' | 'Perdido' | 'Encontrado'
  dateFrom?: string
  dateTo?: string
  dateFromInvalidInput?: boolean
  dateToInvalidInput?: boolean
  /** Changes only when reset must clear native date segments that have no string value. */
  dateInputRevision?: number
  dateError?:
    | 'La fecha «Desde» debe ser anterior o igual a «Hasta».'
    | 'Indica fechas válidas para el periodo.'
}

export const allCategories = 'Todas las categorías'
export const defaultSelection: FilterSelection = {
  search: '',
  city: '',
  zone: '',
  category: allCategories,
  status: 'Todos',
  dateFrom: '',
  dateTo: '',
  dateFromInvalidInput: false,
  dateToInvalidInput: false,
  dateInputRevision: 0,
}
export const filterOptions = {
  cities,
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
    ...(selection.city ? { city: selection.city } : {}),
    ...(selection.zone?.trim() ? { zone: selection.zone } : {}),
    ...(category ? { category } : {}),
    ...(selection.status !== 'Todos'
      ? { type: selection.status === 'Perdido' ? ('lost' as const) : ('found' as const) }
      : {}),
    ...(selection.dateFrom ? { dateFrom: selection.dateFrom } : {}),
    ...(selection.dateTo ? { dateTo: selection.dateTo } : {}),
    ...(selection.dateFromInvalidInput || selection.dateToInvalidInput
      ? { dateInputInvalid: true }
      : {}),
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
    delete next.urlError
    this.setSelection(next)
    this.onChange(this.state)
  }

  private setSelection(next: FilterSelection) {
    const dateError = validateDateRange(
      next.dateFrom,
      next.dateTo,
      next.dateFromInvalidInput || next.dateToInvalidInput,
    )
    if (dateError) next.dateError = dateRangeMessages[dateError]
    else delete next.dateError
    this.setState(next)
  }

  restore = (query: ReportQuery, invalid = false) =>
    this.setSelection({
      ...defaultSelection,
      search: query.q ?? '',
      city: query.city ?? '',
      zone: query.zone ?? '',
      category: query.category ? categoryLabels[query.category] : allCategories,
      status: query.type === 'lost' ? 'Perdido' : query.type === 'found' ? 'Encontrado' : 'Todos',
      dateFrom: query.dateFrom ?? '',
      dateTo: query.dateTo ?? '',
      dateInputRevision: (this.state.dateInputRevision ?? 0) + 1,
      ...(invalid
        ? {
            urlError:
              'El enlace contiene filtros inválidos. Corrígelos o limpia los filtros para buscar.',
          }
        : {}),
    })

  setSearch = (search: string) => this.update({ search })
  setCity = (city: string) => this.update({ city })
  setZone = (zone: string) => this.update({ zone })
  setCategory = (category: string) => this.update({ category })
  setStatus = (status: FilterSelection['status']) => this.update({ status })
  setDateFrom = (dateFrom: string, invalidInput = false) => {
    if (
      this.state.dateFrom === dateFrom &&
      Boolean(this.state.dateFromInvalidInput) === invalidInput
    )
      return
    this.update({ dateFrom, dateFromInvalidInput: invalidInput })
  }
  setDateTo = (dateTo: string, invalidInput = false) => {
    if (this.state.dateTo === dateTo && Boolean(this.state.dateToInvalidInput) === invalidInput)
      return
    this.update({ dateTo, dateToInvalidInput: invalidInput })
  }
  reset = () =>
    this.update({
      ...defaultSelection,
      ...(this.state.dateFromInvalidInput || this.state.dateToInvalidInput
        ? { dateInputRevision: (this.state.dateInputRevision ?? 0) + 1 }
        : {}),
    })
}
