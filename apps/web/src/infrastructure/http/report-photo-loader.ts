import type { ReportPhotoLoader } from '../../models/reports/photo.js'
import { SessionRejected } from '../../models/auth/session.js'
import { maxPhotoBytes, photoTypes } from '../../models/reports/publication.js'

type ObjectUrls = Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>

function photoResource(image: Blob, urls: ObjectUrls) {
  const source = urls.createObjectURL(image)
  return { source, release: () => urls.revokeObjectURL(source) }
}

export function createPublicPhotoLoader(
  fetcher: typeof fetch = fetch,
  urls: ObjectUrls = URL,
): ReportPhotoLoader {
  return {
    async load(source, signal) {
      const response = await fetcher(source, {
        signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      })
      if (!response.ok) throw new Error('No se pudo cargar la foto pública.')
      return photoResource(await response.blob(), urls)
    },
  }
}

export function createReportPhotoLoader(
  baseUrl: string,
  accessToken: () => Promise<string | undefined>,
  fetcher: typeof fetch = fetch,
  urls: ObjectUrls = URL,
): ReportPhotoLoader {
  const prefix = `${baseUrl.replace(/\/$/, '')}/media/`
  return {
    async load(source, signal) {
      const id = source.startsWith(prefix) ? source.slice(prefix.length) : ''
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
        return { source, release() {} }
      const token = await accessToken()
      if (!token) throw new SessionRejected()
      const response = await fetcher(source, {
        signal,
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.status === 401) throw new SessionRejected()
      if (!response.ok) throw new Error('No se pudo cargar la foto.')
      const image = await response.blob()
      if (!photoTypes.includes(image.type) || !image.size || image.size > maxPhotoBytes)
        throw new Error('La foto recibida no es válida.')
      return photoResource(image, urls)
    },
  }
}
