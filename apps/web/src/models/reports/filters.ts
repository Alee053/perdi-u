import type { ReportCategory, ReportQuery, ReportType } from '@perdiu/contracts'

/** Search criteria; an absent field means "any". */
export interface ReportFilters {
  text: string
  city?: string
  zone?: string
  category?: ReportCategory
  type?: ReportType
  dateFrom?: string
  dateTo?: string
  /** An incomplete or impossible date may have no string value at the input boundary. */
  dateInputInvalid?: boolean
}

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
export function validateDateRange(
  dateFrom?: string,
  dateTo?: string,
  invalidInput = false,
): DateRangeError | undefined {
  if (invalidInput) return 'invalid_date'
  if ((dateFrom && !isCalendarDate(dateFrom)) || (dateTo && !isCalendarDate(dateTo)))
    return 'invalid_date'
  if (dateFrom && dateTo && dateFrom > dateTo) return 'range_order'
  return undefined
}

export const hasActiveFilters = (filters: ReportFilters) =>
  Boolean(
    filters.text.trim() ||
    filters.city ||
    filters.zone?.trim() ||
    filters.category ||
    filters.type ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.dateInputInvalid,
  )

/** Query for the public catalog: trimmed text and only the selected criteria. */
export function toReportQuery(filters: ReportFilters): ReportQuery {
  const text = filters.text.trim()
  const zone = filters.zone?.trim()
  return {
    ...(text ? { q: text } : {}),
    ...(filters.city ? { city: filters.city } : {}),
    ...(zone ? { zone } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
  }
}
