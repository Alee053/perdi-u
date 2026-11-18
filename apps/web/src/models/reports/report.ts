import type { PublicProfile, ReportSummary } from '@perdiu/contracts'

/** Report of the public catalog: exactly the public DTO returned by the API. */
export type CatalogReport = ReportSummary & { source: 'catalog' }
/** Report loaded from the verified account's private history. */
export type OwnReport = ReportSummary & { source: 'own' }

/**
 * Local demonstration report. Its contact phone stays inside the demo flows.
 */
export type DemoReport = ReportSummary & {
  source: 'demo'
  phone: string
}

export type Report = CatalogReport | DemoReport | OwnReport

export const cities = ['La Paz', 'Cochabamba', 'Santa Cruz'] as const

/**
 * Author used by the demonstration fixtures. It grants no permission:
 * ownership of persisted reports comes from the verified session, never from a display name.
 */
export const demoOwner: PublicProfile & { phone: string } = {
  id: 'demo-owner',
  displayName: 'Santiago Demo',
  phone: '59170000000',
}
