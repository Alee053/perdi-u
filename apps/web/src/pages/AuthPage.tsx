import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  MailCheck,
  PawPrint,
} from 'lucide-react'
import type { AuthPresenter, FormResult } from '../auth/presenter'

export type AuthMode = 'login' | 'register'

type AuthPageProps = {
  mode: AuthMode
  presenter: AuthPresenter
  notice?: string
  onModeChange: (mode: AuthMode) => void
  onBack: () => void
}

type FieldErrors = Extract<FormResult, { ok: false }>['fieldErrors']

export function AuthPage({ mode, presenter, notice, onModeChange, onBack }: AuthPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [resendStatus, setResendStatus] = useState('')
  const register = mode === 'register'

  const changeMode = (next: AuthMode) => {
    setErrors({})
    setMessage('')
    setPassword('')
    setConfirmPassword('')
    setSentTo('')
    onModeChange(next)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setMessage('')
    const result = register
      ? await presenter.signUp({ email, password, confirmPassword })
      : await presenter.signIn({ email, password })
    setPending(false)
    if (!result.ok) {
      setErrors(result.fieldErrors)
      setMessage(result.message ?? '')
      return
    }
    setErrors({})
    setPassword('')
    setConfirmPassword('')
    if (result.confirmationSent) setSentTo(email.trim())
  }

  const resend = async () => {
    setResendStatus('Enviando…')
    const failure = await presenter.resendConfirmation(sentTo)
    setResendStatus(failure ?? 'Si el correo puede registrarse, enviamos un nuevo enlace.')
  }

  return (
    <div className="auth-shell">
      <aside className="auth-brand-panel" aria-hidden="true">
        <span className="brand-mark">
          <PawPrint size={19} strokeWidth={2.2} />
        </span>
        <h2>
          Lo importante siempre encuentra el <span>camino</span>.
        </h2>
        <p>Tu cuenta protege tus reportes y tus datos de contacto.</p>
      </aside>

      <main className="auth-main">
        <button type="button" className="auth-back" onClick={onBack}>
          <ArrowLeft size={15} /> Volver al catálogo
        </button>

        <section className="auth-card panel" aria-labelledby="auth-title">
          {sentTo ? (
            <div className="auth-sent" role="status">
              <span className="auth-sent-icon">
                <MailCheck size={22} />
              </span>
              <h1 id="auth-title">Revisa tu correo</h1>
              <p>
                Si <b>{sentTo}</b> puede registrarse, te enviamos un enlace para confirmar la
                cuenta. Ábrelo en este navegador para ingresar directamente.
              </p>
              <button type="button" className="secondary-button" onClick={resend}>
                Reenviar enlace
              </button>
              {resendStatus && <small>{resendStatus}</small>}
              <button type="button" className="auth-link" onClick={() => changeMode('login')}>
                Volver a iniciar sesión
              </button>
            </div>
          ) : (
            <>
              <div className="auth-heading">
                <div className="page-eyebrow">{register ? 'NUEVA CUENTA' : 'BIENVENIDO'}</div>
                <h1 id="auth-title">{register ? 'Crear cuenta' : 'Iniciar sesión'}</h1>
                <p>
                  {register
                    ? 'Regístrate con tu correo para publicar y gestionar reportes.'
                    : 'Ingresa para publicar, guardar y gestionar tus reportes.'}
                </p>
              </div>

              {notice && !message && (
                <p className="auth-notice" role="status">
                  {notice}
                </p>
              )}
              {message && (
                <p className="auth-error" role="alert">
                  {message}
                </p>
              )}

              <form className="auth-form" onSubmit={submit} noValidate>
                <label className="form-field">
                  <span>Correo electrónico</span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    disabled={pending}
                    required
                  />
                  {errors.email && <small id="email-error">{errors.email}</small>}
                </label>

                <label className="form-field">
                  <span>Contraseña</span>
                  <span className="auth-password">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={register ? 'new-password' : 'current-password'}
                      placeholder={register ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? 'password-error' : undefined}
                      disabled={pending}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </span>
                  {errors.password && <small id="password-error">{errors.password}</small>}
                </label>

                {register && (
                  <label className="form-field">
                    <span>Confirmar contraseña</span>
                    <input
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      aria-invalid={Boolean(errors.confirmPassword)}
                      aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
                      disabled={pending}
                      required
                    />
                    {errors.confirmPassword && (
                      <small id="confirm-error">{errors.confirmPassword}</small>
                    )}
                  </label>
                )}

                <button className="primary-button auth-submit" type="submit" disabled={pending}>
                  {pending ? (
                    <>
                      <LoaderCircle size={15} className="spin" />
                      {register ? 'Creando cuenta…' : 'Ingresando…'}
                    </>
                  ) : register ? (
                    'Crear cuenta'
                  ) : (
                    'Iniciar sesión'
                  )}
                </button>
              </form>

              <p className="auth-switch">
                {register ? '¿Ya tienes una cuenta?' : '¿Aún no tienes cuenta?'}{' '}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => changeMode(register ? 'login' : 'register')}
                >
                  {register ? 'Inicia sesión' : 'Crea una cuenta'}
                </button>
              </p>
              <p className="auth-privacy">
                <LockKeyhole size={13} /> Tu correo es privado y no se muestra a otras personas.
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
