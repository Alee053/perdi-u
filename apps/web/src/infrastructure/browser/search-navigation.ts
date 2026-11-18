import type { ReportQuery } from '@perdiu/contracts'
import {
  readSearchParameters,
  searchKeys,
  type SearchNavigation,
} from '../../models/reports/search-location.js'

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

interface NavigationEffects {
  currentPath(): string
  showPath(path: string, mode: 'push' | 'replace'): void
  onPathChange(listener: (path: string) => void): () => void
}

export function createSearchNavigation(effects: NavigationEffects): SearchNavigation {
  return {
    current: () => readSearchPath(effects.currentPath()),
    replace: (query) => {
      const path = searchPath(query)
      if (effects.currentPath() !== path) effects.showPath(path, 'replace')
    },
    onChange: (listener) => effects.onPathChange((path) => listener(readSearchPath(path))),
  }
}
