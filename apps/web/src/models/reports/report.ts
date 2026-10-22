import type { PublicProfile, ReportSummary } from '@perdiu/contracts'

/** Report of the public catalog: exactly the public DTO returned by the API. */
export type CatalogReport = ReportSummary & { source: 'catalog' }
export type OwnReport = ReportSummary & { source: 'own' }

/**
 * Local demonstration report. Besides the public fields it keeps a contact phone and a position on
 * the illustrative map; both stay inside the demo flows and never reach the catalog.
 */
export type DemoReport = ReportSummary & {
  source: 'demo'
  phone: string
  position: { top: string; left: string }
}

export type Report = CatalogReport | DemoReport | OwnReport

export const cities = ['La Paz', 'Cochabamba', 'Santa Cruz'] as const

/**
 * Owner of the demo flows until publishing uses the API. Ownership is compared by id: a display
 * name is presentation only and never proves who owns a report.
 */
export const demoOwner: PublicProfile & { phone: string } = {
  id: 'demo-owner',
  displayName: 'Santiago Demo',
  phone: '59170000000',
}

export const isOwnedBy = (report: Report, ownerId: string) =>
  report.source === 'demo' && report.author.id === ownerId
