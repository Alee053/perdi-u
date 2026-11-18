import type { Report } from './report.js'

export interface ReportStats {
  active: number
  lost: number
  found: number
  byCity: { city: string; count: number }[]
}

export function summarizeReports(reports: readonly Report[]): ReportStats {
  let lost = 0
  let found = 0
  const cities = new Map<string, number>()
  for (const report of reports) {
    if (report.state !== 'active') continue
    if (report.type === 'lost') lost++
    else found++
    cities.set(report.city, (cities.get(report.city) ?? 0) + 1)
  }
  return {
    active: lost + found,
    lost,
    found,
    byCity: Array.from(cities, ([city, count]) => ({ city, count })),
  }
}
