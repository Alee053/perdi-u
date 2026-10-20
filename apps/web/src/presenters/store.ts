/**
 * Observable presentation state shared by every presenter core. It has no React dependency:
 * `useStore` subscribes React to it and tests read `getSnapshot()` directly.
 */
export class Store<State> {
  private listeners = new Set<() => void>()
  constructor(protected state: State) {}

  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  protected setState(state: State) {
    this.state = state
    this.listeners.forEach((listener) => listener())
  }
}
