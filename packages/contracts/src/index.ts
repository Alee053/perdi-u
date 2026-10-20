/** Shared report model; ownership is the verified Auth subject, never a display name. */
export type ReportType = 'lost' | 'found'
export type ReportState = 'active' | 'resolved'
export type ReportCategory = 'pet' | 'object' | 'document'

export interface ReportQuery {
  q?: string
  type?: ReportType
  category?: ReportCategory
  city?: string
}

export const REPORT_RESULT_LIMIT = 50

export interface ReportData {
  id: string
  ownerId: string
  title: string
  description: string
  type: ReportType
  state: ReportState
  category: ReportCategory
  city: string
  zone: string
  incidentDate: string
  createdAt: string
}

/** Public allowlist: private contact and storage keys have no place in this DTO. */
export interface ReportSummary extends Omit<ReportData, 'ownerId'> {
  author: PublicProfile
  imageUrls: string[]
}

/** Public fields returned by the stable report-detail endpoint. */
export type ReportDetail = ReportSummary

/** Private response of GET /reports/:id/contact; never included in public report data. */
export interface ReportContact {
  phone: string
}

export interface PublicProfile {
  id: string
  displayName: string
  photoUrl?: string
}

/**
 * Private response of GET /me: the verified Auth subject, its own e-mail and, when a local profile
 * exists, its display name and photo. The e-mail never appears in public DTOs.
 */
export interface AccountIdentity {
  id: string
  email: string
  displayName?: string
  photoUrl?: string
}
