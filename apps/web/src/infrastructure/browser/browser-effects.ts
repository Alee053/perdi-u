/**
 * Browser implementation of the effects that presenters request (`presenters/effects.ts`). It is
 * the only place, together with the Auth adapter, that touches `window`.
 */
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
  openWhatsApp(phone: string, message: string) {
    window.open(
      'https://wa.me/' + phone + '?text=' + encodeURIComponent(message),
      '_blank',
      'noopener,noreferrer',
    )
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
