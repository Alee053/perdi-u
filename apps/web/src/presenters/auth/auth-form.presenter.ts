import { Store } from '../store.js'
import type { AuthPresenter, FieldErrors } from './auth.presenter.js'

export type AuthMode = 'login' | 'register'

export interface AuthFormState {
  email: string
  password: string
  confirmPassword: string
  showPassword: boolean
  pending: boolean
  errors: FieldErrors
  message: string
  /** E-mail to which a confirmation link was sent; the form is replaced by that notice. */
  sentTo: string
  resendStatus: string
}

const initial: AuthFormState = {
  email: '',
  password: '',
  confirmPassword: '',
  showPassword: false,
  pending: false,
  errors: {},
  message: '',
  sentTo: '',
  resendStatus: '',
}

/** Login/registration form: one instance per mode, so changing mode starts a clean form. */
export class AuthFormPresenter extends Store<AuthFormState> {
  constructor(
    readonly mode: AuthMode,
    private readonly auth: Pick<AuthPresenter, 'signIn' | 'signUp' | 'resendConfirmation'>,
  ) {
    super(initial)
  }

  private update(patch: Partial<AuthFormState>) {
    this.setState({ ...this.state, ...patch })
  }

  setEmail = (email: string) => this.update({ email })
  setPassword = (password: string) => this.update({ password })
  setConfirmPassword = (confirmPassword: string) => this.update({ confirmPassword })
  togglePassword = () => this.update({ showPassword: !this.state.showPassword })

  submit = async () => {
    if (this.state.pending) return
    this.update({ pending: true, message: '' })
    const { email, password, confirmPassword } = this.state
    const result =
      this.mode === 'register'
        ? await this.auth.signUp({ email, password, confirmPassword })
        : await this.auth.signIn({ email, password })
    if (!result.ok)
      return this.update({
        pending: false,
        errors: result.fieldErrors,
        message: result.message ?? '',
      })
    this.update({
      pending: false,
      errors: {},
      password: '',
      confirmPassword: '',
      ...(result.confirmationSent ? { sentTo: email.trim() } : {}),
    })
  }

  resend = async () => {
    this.update({ resendStatus: 'Enviando…' })
    const failure = await this.auth.resendConfirmation(this.state.sentTo)
    this.update({
      resendStatus: failure ?? 'Si el correo puede registrarse, enviamos un nuevo enlace.',
    })
  }
}
