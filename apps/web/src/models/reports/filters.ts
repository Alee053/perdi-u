import type { ReportCategory, ReportQuery, ReportType } from '@perdiu/contracts'
import type { Report } from './report.js'

/** Search criteria; an absent field means "any". */
export interface ReportFilters {
  text: string
  city?: string
  category?: ReportCategory
  type?: ReportType
  dateFrom?: string
  dateTo?: string
}

export const noFilters: ReportFilters = { text: '' }

export type DateRangeError = 'invalid_date' | 'range_order'

function isCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || month < 1 || month > 12) return false
  const leap = year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day >= 1 && day <= days[month - 1]!
}

/** Validates calendar dates and an inclusive, optionally open range without timezone conversion. */
export function validateDateRange(dateFrom?: string, dateTo?: string): DateRangeError | undefined {
  if ((dateFrom && !isCalendarDate(dateFrom)) || (dateTo && !isCalendarDate(dateTo)))
    return 'invalid_date'
  if (dateFrom && dateTo && dateFrom > dateTo) return 'range_order'
  return undefined
}

export const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')

export const hasActiveFilters = (filters: ReportFilters) =>
  Boolean(
    filters.text.trim() ||
    filters.city ||
    filters.category ||
    filters.type ||
    filters.dateFrom ||
    filters.dateTo,
  )

/** Query for the public catalog: trimmed text and only the selected criteria. */
export function toReportQuery(filters: ReportFilters): ReportQuery {
  const text = filters.text.trim()
  return {
    ...(text ? { q: text } : {}),
    ...(filters.city ? { city: filters.city } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
  }
}

/** Local search over demo reports: active only, text without accents or case, exact selections. */
export function matchesFilters(report: Report, filters: ReportFilters) {
  if (
    validateDateRange(filters.dateFrom, filters.dateTo) ||
    (filters.dateFrom && report.incidentDate < filters.dateFrom) ||
    (filters.dateTo && report.incidentDate > filters.dateTo)
  )
    return false
  const text = normalizeText([report.title, report.description, report.zone, report.city].join(' '))
  return (
    report.state === 'active' &&
    (!filters.text || text.includes(normalizeText(filters.text))) &&
    (!filters.city || report.city === filters.city) &&
    (!filters.category || report.category === filters.category) &&
    (!filters.type || report.type === filters.type)
  )
}
