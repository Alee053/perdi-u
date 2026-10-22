import { useEffect } from 'react'
import { useStore } from '../useStore.js'
import type { PublishPresenter } from './publish.presenter.js'

/** Keeps the form subscription and preview cleanup within the publish page lifecycle. */
export function usePublishPage(presenter: PublishPresenter) {
  const form = useStore(presenter)
  useEffect(() => () => presenter.releasePhotos(), [presenter])
  return { form, actions: presenter }
}
