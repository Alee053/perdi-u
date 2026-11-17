/**
 * Browser implementation of the effects that presenters request (`presenters/effects.ts`). It is
 * the only place, together with the Auth adapter, that touches `window`.
 */
const pathChangeEvent = 'perdiu:pathchange'

export const browserEffects = {
  schedule(task: () => void, milliseconds: number) {
    const timer = window.setTimeout(task, milliseconds)
    return () => window.clearTimeout(timer)
  },
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  },
  onPageRestored(listener: () => void) {
    const handle = (event: PageTransitionEvent) => {
      if (event.persisted) listener()
    }
    window.addEventListener('pageshow', handle)
    return () => window.removeEventListener('pageshow', handle)
  },
  reload() {
    window.location.reload()
  },
  openWhatsApp(url: string) {
    // `noopener` makes window.open return null, so a blocked popup cannot be told apart; the
    // link opens in a new tab as before.
    window.open(url, '_blank', 'noopener,noreferrer')
  },
  currentPath() {
    return window.location.pathname + window.location.search
  },
  showPath(path: string, mode: 'push' | 'replace') {
    const state = { perdiuNavigation: true }
    if (mode === 'push') window.history.pushState(state, '', path)
    else
      window.history.replaceState(
        window.history.state?.perdiuNavigation === true ? state : null,
        '',
        path,
      )
  },
  hasAppReturn() {
    return window.history.state?.perdiuNavigation === true
  },
  onPathChange(listener: (path: string) => void) {
    const handle = () => listener(window.location.pathname + window.location.search)
    window.addEventListener('popstate', handle)
    window.addEventListener(pathChangeEvent, handle)
    return () => {
      window.removeEventListener('popstate', handle)
      window.removeEventListener(pathChangeEvent, handle)
    }
  },
  notifyPathChange() {
    window.dispatchEvent(new Event(pathChangeEvent))
  },
  back() {
    window.history.back()
  },
  absoluteUrl(path: string) {
    return new URL(path, window.location.origin).href
  },
  /** The presenter receives a `File` from the input; it is a `Blob` for the browser. */
  createPreview(file: { type: string; size: number }) {
    return URL.createObjectURL(file as Blob)
  },
  revokePreview(url: string) {
    URL.revokeObjectURL(url)
  },
  now: () => new Date(),
  newId: () => 'demo-' + Date.now(),
}
