import type { ReportQuery } from '@perdiu/contracts'
import { readSearchParameters, searchKeys } from '../../models/reports/search-location.js'

const localOrigin = 'https://perdiu.invalid'

export function readSearchPath(path: string) {
  const url = new URL(path, localOrigin)
  if (url.origin !== localOrigin || url.pathname !== '/') return undefined
  return readSearchParameters(url.searchParams)
}

export function searchPath(query: ReportQuery): string {
  const params = new URLSearchParams()
  for (const key of searchKeys) {
    const value = query[key]?.trim()
    if (value) params.set(key, value)
  }
  return params.size ? `/?${params}` : '/'
}
