import { cities, type Report } from './report.js'

export interface ReportStats {
  active: number
  lost: number
  found: number
  resolved: number
  /** Active reports per known city, plus the rest under `other`. */
  byCity: { city: string; count: number }[]
  other: number
}

export function summarizeReports(reports: Report[]): ReportStats {
  const active = reports.filter((report) => report.state === 'active')
  const byCity = cities.map((city) => ({
    city,
    count: active.filter((report) => report.city === city).length,
  }))
  return {
    active: active.length,
    lost: active.filter((report) => report.type === 'lost').length,
    found: active.filter((report) => report.type === 'found').length,
    resolved: reports.length - active.length,
    byCity,
    other: active.length - byCity.reduce((total, { count }) => total + count, 0),
  }
}
