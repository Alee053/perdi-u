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
  /** Opens a chat link already built and validated by `models/reports/contact`. */
  openWhatsApp(url: string): void
  /** Path and search of the address bar, including public search filters. */
  currentPath(): string
  /** This entry was pushed by the app, so going back stays in its navigation. */
  hasAppReturn(): boolean
  /** Changes the address without reloading; `push` adds a history entry that «Atrás» undoes. */
  showPath(path: string, mode: 'push' | 'replace'): void
  /** History traversal or explicit URL cleanup changed the address. */
  onPathChange(listener: (path: string) => void): () => void
  back(): void
  /** Absolute address of an app path, to share it outside PerdiU. */
  absoluteUrl(path: string): string
  createPreview(file: PhotoFile): string
  revokePreview(url: string): void
  now(): Date
  newId(): string
}
