import type { AccountIdentity } from '@perdiu/contracts'
import type { AuthMode } from '../auth/auth-form.presenter.js'
import { signedOutNotice, type AuthPresenter } from '../auth/auth.presenter.js'
import type { Effects } from '../effects.js'
import { Store } from '../store.js'
import type { NoticePresenter } from './notice.presenter.js'
import { sectionLabels, type Section } from './sections.js'

export interface ShellState {
  section: Section
  /** Login or registration screen shown instead of the dashboard. */
  authView: AuthMode | null
  /** Private section to open after signing in. */
  pendingSection: Section | null
  menuOpen: boolean
  signingOut: boolean
}

export interface AccountView {
  name: string
  email: string
  photoUrl?: string
}

interface Dependencies {
  auth: Pick<AuthPresenter, 'getSnapshot' | 'subscribe' | 'access' | 'signOut' | 'start'>
  notices: Pick<NoticePresenter, 'show'>
  effects: Pick<Effects, 'scrollToTop' | 'onPageRestored' | 'reload'>
  /** Clears the private, per-account state of other presenters. */
  onSignedOut: () => void
}

/** Display name is presentation only; without a profile, the e-mail's local part stands in. */
export const toAccountView = (account: AccountIdentity): AccountView => ({
  name: account.displayName ?? account.email.split('@')[0]!,
  email: account.email,
  ...(account.photoUrl ? { photoUrl: account.photoUrl } : {}),
})

/** Navigation of the dashboard: current section, access to private sections and the session. */
export class ShellPresenter extends Store<ShellState> {
  constructor(private readonly dependencies: Dependencies) {
    super({
      section: 'overview',
      authView: null,
      pendingSection: null,
      menuOpen: false,
      signingOut: false,
    })
  }

  private update(patch: Partial<ShellState>) {
    this.setState({ ...this.state, ...patch })
  }

  /** Starts the session and follows its changes; returns the cleanup for the view's lifecycle. */
  start = () => {
    const { auth, effects } = this.dependencies
    const unsubscribe = auth.subscribe(this.followSession)
    // Back/forward cache restores a frozen page; reload it so private data is verified again.
    const stopWatching = effects.onPageRestored(() => effects.reload())
    void auth.start()
    return () => {
      unsubscribe()
      stopWatching()
    }
  }

  private followSession = () => {
    const { auth } = this.dependencies
    const session = auth.getSnapshot()
    const { section, authView, pendingSection } = this.state
    if (session.status === 'authenticated') {
      if (authView)
        this.update({ authView: null, section: pendingSection ?? 'overview', pendingSection: null })
      return
    }
    // Our own sign-out moves to the catalog by itself; it must not open the login screen.
    if (session.status === 'anonymous' && session.notice === signedOutNotice) return
    // Private sections need a verified session; remember the destination for after login.
    if (auth.access(section) === 'login')
      this.update({ pendingSection: section, section: 'overview', authView: 'login' })
    else if (session.status === 'anonymous' && session.notice && !authView)
      this.update({ authView: 'login' })
  }

  navigate = (section: Section) => {
    if (this.dependencies.auth.access(section) === 'login') {
      this.update({ pendingSection: section, authView: 'login', menuOpen: false })
      return
    }
    this.update({ section, menuOpen: false })
    this.dependencies.effects.scrollToTop()
  }

  openAuth = (mode: AuthMode) =>
    this.update({ pendingSection: null, authView: mode, menuOpen: false })
  /** Switches between login and registration keeping the destination after signing in. */
  switchAuthMode = (mode: AuthMode) => this.update({ authView: mode })
  closeAuth = () => this.update({ authView: null, pendingSection: null, section: 'explore' })
  openMenu = () => this.update({ menuOpen: true })
  closeMenu = () => this.update({ menuOpen: false })

  signOut = async () => {
    if (this.state.signingOut) return
    const { auth, notices, onSignedOut } = this.dependencies
    this.update({ signingOut: true })
    const failure = await auth.signOut()
    if (failure) {
      this.update({ signingOut: false })
      notices.show(failure, true)
      return
    }
    onSignedOut()
    this.update({ signingOut: false, section: 'explore', menuOpen: false })
    notices.show(signedOutNotice)
  }

  view = () => {
    const { auth } = this.dependencies
    const session = auth.getSnapshot()
    return {
      title: sectionLabels[this.state.section],
      access: auth.access(this.state.section),
      account: session.status === 'authenticated' ? toAccountView(session.user) : null,
      restoring: session.status === 'restoring',
      authNotice: session.status === 'anonymous' ? session.notice : undefined,
    }
  }
}
