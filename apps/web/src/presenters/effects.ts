/** A photo chosen by the person; the browser `File` satisfies it. */
export interface PhotoFile {
  type: string
  size: number
}

/**
 * Side effects that presenters request but do not perform. The browser adapter in
 * `infrastructure/browser` implements them and tests replace them with doubles.
 */
export interface Effects {
  schedule(task: () => void, milliseconds: number): () => void
  scrollToTop(): void
  /** The page came back from the back/forward cache. */
  onPageRestored(listener: () => void): () => void
  reload(): void
  openWhatsApp(phone: string, message: string): void
  createPreview(file: PhotoFile): string
  revokePreview(url: string): void
  now(): Date
  newId(): string
}
