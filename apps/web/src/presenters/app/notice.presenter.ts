import type { Effects } from '../effects.js'
import { Store } from '../store.js'

export interface Notice {
  message: string
  error: boolean
}

/** Short confirmation or error shown after an action; it closes by itself. */
export class NoticePresenter extends Store<Notice | null> {
  private cancelTimer?: () => void
  constructor(
    private readonly effects: Pick<Effects, 'schedule'>,
    private readonly duration = 3800,
  ) {
    super(null)
  }

  show = (message: string, error = false) => {
    this.cancelTimer?.()
    this.setState({ message, error })
    this.cancelTimer = this.effects.schedule(this.dismiss, this.duration)
  }

  dismiss = () => {
    this.cancelTimer?.()
    this.cancelTimer = undefined
    this.setState(null)
  }
}
