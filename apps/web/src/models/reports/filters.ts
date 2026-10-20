import type { ReportCategory, ReportQuery, ReportType } from '@perdiu/contracts'
import type { Report } from './report.js'

/** Search criteria; an absent field means "any". */
export interface ReportFilters {
  text: string
  city?: string
  category?: ReportCategory
  type?: ReportType
}

export const noFilters: ReportFilters = { text: '' }

export const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')

export const hasActiveFilters = (filters: ReportFilters) =>
  Boolean(filters.text.trim() || filters.city || filters.category || filters.type)

/** Query for the public catalog: trimmed text and only the selected criteria. */
export function toReportQuery(filters: ReportFilters): ReportQuery {
  const text = filters.text.trim()
  return {
    ...(text ? { q: text } : {}),
    ...(filters.city ? { city: filters.city } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.type ? { type: filters.type } : {}),
  }
}

/** Local search over demo reports: active only, text without accents or case, exact selections. */
export function matchesFilters(report: Report, filters: ReportFilters) {
  const text = normalizeText([report.title, report.description, report.zone, report.city].join(' '))
  return (
    report.state === 'active' &&
    (!filters.text || text.includes(normalizeText(filters.text))) &&
    (!filters.city || report.city === filters.city) &&
    (!filters.category || report.category === filters.category) &&
    (!filters.type || report.type === filters.type)
  )
}
