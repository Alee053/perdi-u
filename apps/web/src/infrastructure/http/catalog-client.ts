import type { ReportsRepository } from '../../models/reports/reports-repository.js'

import { readReport } from './report-response.js'

export function createReportsClient(
  baseUrl = '/api',
  fetcher: typeof fetch = fetch,
): ReportsRepository {
  return {
    async list(signal, query = {}) {
      const params = new URLSearchParams()
      for (const key of ['q', 'type', 'category', 'city'] as const) {
        if (query[key]) params.set(key, query[key])
      }
      const search = params.size ? `?${params}` : ''
      const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/reports${search}`, {
        signal,
        credentials: 'omit',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('No se pudo consultar el catálogo.')
      const data: unknown = await response.json()
      if (!Array.isArray(data)) throw new Error('La respuesta del catálogo no es válida.')
      return data.map((value) => readReport(value))
    },
  }
}
