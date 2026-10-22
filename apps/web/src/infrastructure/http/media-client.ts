import type { ReportMediaClient, ReportPhotoFile } from '../../models/reports/publication.js'
import { ReportPublishFailure } from '../../models/reports/publication.js'

/** Authenticated multipart adapter for private report photos. */
export function createReportMediaClient(
  baseUrl: string,
  accessToken: () => Promise<string | undefined>,
  fetcher: typeof fetch = fetch,
): ReportMediaClient {
  const endpoint = `${baseUrl.replace(/\/$/, '')}/media`
  const token = async () => {
    try {
      const value = await accessToken()
      if (!value) throw new ReportPublishFailure('unauthorized')
      return value
    } catch (error) {
      if (error instanceof ReportPublishFailure) throw error
      throw new ReportPublishFailure('unavailable')
    }
  }

  return {
    async upload(file: ReportPhotoFile) {
      const access = await token()
      const data = new FormData()
      data.append('file', new Blob([await file.arrayBuffer()], { type: file.type }), file.name)
      let response: Response
      try {
        response = await fetcher(endpoint, {
          method: 'POST',
          credentials: 'omit',
          headers: { Accept: 'application/json', Authorization: `Bearer ${access}` },
          body: data,
        })
      } catch {
        throw new ReportPublishFailure('unavailable')
      }
      if (response.status === 401) throw new ReportPublishFailure('unauthorized')
      if (!response.ok) throw new ReportPublishFailure('unavailable')
      try {
        const result: unknown = await response.json()
        if (
          typeof result !== 'object' ||
          result === null ||
          !('id' in result) ||
          typeof result.id !== 'string' ||
          !result.id
        )
          throw new Error()
        return result.id
      } catch {
        throw new ReportPublishFailure('unavailable')
      }
    },

    async remove(id: string) {
      const access = await token()
      let response: Response
      try {
        response = await fetcher(`${endpoint}/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          credentials: 'omit',
          headers: { Authorization: `Bearer ${access}` },
        })
      } catch {
        throw new ReportPublishFailure('unavailable')
      }
      if (response.status === 404) return
      if (response.status === 401) throw new ReportPublishFailure('unauthorized')
      if (!response.ok) throw new ReportPublishFailure('unavailable')
    },
  }
}
