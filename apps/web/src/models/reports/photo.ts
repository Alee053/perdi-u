/** An image resource released when the view stops using it. */
export interface ReportPhotoResource {
  source: string
  release(): void
}

export interface ReportPhotoLoader {
  load(source: string, signal: AbortSignal): Promise<ReportPhotoResource>
}
