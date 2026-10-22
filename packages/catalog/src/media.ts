export const REPORT_MEDIA_MAX_BYTES = 5 * 1024 * 1024
const supportedContentTypes = new Set(['image/jpeg', 'image/png'])
const mediaIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface ReportMediaMetadataRepository {
  create(
    ownerId: string,
    id: string,
    storageKey: string,
    contentType: 'image/jpeg' | 'image/png',
    size: number,
  ): Promise<void>
  beginDelete(ownerId: string, id: string): Promise<string | undefined>
  completeDelete(id: string): Promise<void>
  findAttached(
    id: string,
  ): Promise<{ storageKey: string; contentType: 'image/jpeg' | 'image/png' } | undefined>
}

export interface ReportMediaStorage {
  put(key: string, contentType: string, bytes: Uint8Array): Promise<void>
  get(key: string): Promise<Uint8Array | undefined>
  delete(key: string): Promise<void>
  close?(): void
}

export class ReportMediaError extends Error {
  constructor(readonly reason: 'invalid' | 'unavailable' | 'not_found' | 'limit') {
    super(reason)
  }
}

export class MediaLimitError extends Error {
  constructor() {
    super('Ya hay tres fotos pendientes de asociar.')
  }
}

export class MediaAssociationError extends Error {
  constructor() {
    super('Las fotos ya no están disponibles para este reporte.')
  }
}

/** Coordinates private object storage with its database metadata. */
export class ReportMediaService {
  constructor(
    private readonly metadata: ReportMediaMetadataRepository,
    private readonly storage?: ReportMediaStorage,
  ) {}

  async upload(
    ownerId: string,
    id: string,
    contentType: string,
    bytes: Uint8Array,
  ): Promise<string> {
    if (
      !mediaIdPattern.test(id) ||
      !supportedContentTypes.has(contentType) ||
      bytes.byteLength === 0 ||
      bytes.byteLength > REPORT_MEDIA_MAX_BYTES
    )
      throw new ReportMediaError('invalid')
    if (!this.storage) throw new ReportMediaError('unavailable')

    const storageKey = `report-media/${id}`
    try {
      await this.storage.put(storageKey, contentType, bytes)
      await this.metadata.create(
        ownerId,
        id,
        storageKey,
        contentType as 'image/jpeg' | 'image/png',
        bytes.byteLength,
      )
      return id
    } catch (error) {
      try {
        await this.storage.delete(storageKey)
      } catch {
        // The object key is server generated; an orphan can be removed by the documented cleanup.
      }
      throw new ReportMediaError(error instanceof MediaLimitError ? 'limit' : 'unavailable')
    }
  }

  async remove(ownerId: string, id: string): Promise<void> {
    if (!mediaIdPattern.test(id)) throw new ReportMediaError('not_found')
    const storage = this.storage
    if (!storage) throw new ReportMediaError('unavailable')
    let key: string | undefined
    try {
      key = await this.metadata.beginDelete(ownerId, id)
    } catch {
      throw new ReportMediaError('unavailable')
    }
    if (!key) throw new ReportMediaError('not_found')
    try {
      await storage.delete(key)
      await this.metadata.completeDelete(id)
    } catch {
      throw new ReportMediaError('unavailable')
    }
  }

  async read(id: string): Promise<{ contentType: string; bytes: Uint8Array }> {
    if (!mediaIdPattern.test(id)) throw new ReportMediaError('not_found')
    const storage = this.storage
    if (!storage) throw new ReportMediaError('unavailable')
    let media: Awaited<ReturnType<ReportMediaMetadataRepository['findAttached']>>
    try {
      media = await this.metadata.findAttached(id)
    } catch {
      throw new ReportMediaError('unavailable')
    }
    if (!media) throw new ReportMediaError('not_found')
    try {
      const bytes = await storage.get(media.storageKey)
      if (!bytes) throw new Error()
      return { contentType: media.contentType, bytes }
    } catch {
      throw new ReportMediaError('unavailable')
    }
  }
}
