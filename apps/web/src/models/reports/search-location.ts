import type { ReportQuery } from '@perdiu/contracts'
import { validateDateRange } from './filters.js'

export const searchKeys = ['q', 'type', 'category', 'city', 'zone', 'dateFrom', 'dateTo'] as const

export interface SearchLocation {
  query: ReportQuery
  invalid: boolean
}

/** Decoded parameters are data; browser navigation belongs to the adapter. */
export function readSearchParameters(entries: Iterable<readonly [string, string]>): SearchLocation {
  const grouped = new Map<string, string[]>()
  let invalid = false
  for (const [key, value] of entries) {
    if (!searchKeys.includes(key as (typeof searchKeys)[number])) {
      invalid = true
      continue
    }
    grouped.set(key, [...(grouped.get(key) ?? []), value])
  }
  const values: Record<string, string> = {}
  for (const key of searchKeys) {
    const items = grouped.get(key)
    if (!items) continue
    if (items.length !== 1) {
      invalid = true
      continue
    }
    const raw = items[0]!
    const date = key === 'dateFrom' || key === 'dateTo'
    const limit = key === 'q' || key === 'zone' ? 200 : date ? 10 : 100
    if (raw.length > limit || /[\u0000-\u001f\u007f]/.test(raw)) {
      invalid = true
      continue
    }
    const value = raw.trim()
    if (!value) continue
    if (
      (key === 'type' && value !== 'lost' && value !== 'found') ||
      (key === 'category' && !['pet', 'object', 'document'].includes(value)) ||
      (date && (raw !== value || validateDateRange(value)))
    ) {
      invalid = true
      continue
    }
    values[key] = value
  }
  const query = values as ReportQuery
  return { query, invalid: invalid || Boolean(validateDateRange(query.dateFrom, query.dateTo)) }
}
