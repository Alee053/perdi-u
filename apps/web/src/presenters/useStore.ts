import { useSyncExternalStore } from 'react'
import type { Store } from './store.js'

/** React adapter: re-renders the view whenever a presenter publishes a new state. */
export const useStore = <State>(store: Store<State>) =>
  useSyncExternalStore(store.subscribe, store.getSnapshot)
