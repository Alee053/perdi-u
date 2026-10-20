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
import type { AuthMode } from '../../presenters/auth/auth-form.presenter'
import type { AuthPresenter } from '../../presenters/auth/auth.presenter'
import { useAuthForm } from '../../presenters/auth/useAuthForm'

type AuthPageProps = {
  mode: AuthMode
  auth: AuthPresenter
  notice?: string
  onModeChange: (mode: AuthMode) => void
  onBack: () => void
}

export function AuthPage({ mode, auth, notice, onModeChange, onBack }: AuthPageProps) {
  const { state, form } = useAuthForm(mode, auth)
  const register = mode === 'register'
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void form.submit()
  }

  return (
    <main className="auth-page">
      <button type="button" className="text-button" onClick={onBack}>
        <ArrowLeft size={15} /> Volver al catálogo
      </button>
      <section className="panel auth-card" aria-labelledby="auth-title">
        <span className="brand-mark" aria-hidden="true">
          <PawPrint size={18} />
        </span>
        {state.sentTo ? (
          <div className="auth-sent" role="status">
            <MailCheck size={24} aria-hidden="true" />
            <h1 id="auth-title">Revisa tu correo</h1>
            <p>
              Si <b>{state.sentTo}</b> puede registrarse, te enviamos un enlace para confirmar la
              cuenta. Ábrelo en este navegador para ingresar directamente.
            </p>
            <button type="button" className="secondary-button" onClick={() => void form.resend()}>
              Reenviar enlace
            </button>
            {state.resendStatus && <small>{state.resendStatus}</small>}
            <button type="button" className="text-button" onClick={() => onModeChange('login')}>
              Volver a iniciar sesión
            </button>
          </div>
        ) : (
          <>
            <h1 id="auth-title">{register ? 'Crear cuenta' : 'Iniciar sesión'}</h1>
            <p className="auth-lead">
              {register
                ? 'Regístrate con tu correo para publicar y gestionar reportes.'
                : 'Ingresa para publicar, guardar y gestionar tus reportes.'}
            </p>
            {notice && !state.message && (
              <p className="message" role="status">
                {notice}
              </p>
            )}
            {state.message && (
              <p className="message message-error" role="alert">
                {state.message}
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
                  value={state.email}
                  onChange={(event) => form.setEmail(event.target.value)}
                  aria-invalid={Boolean(state.errors.email)}
                  aria-describedby={state.errors.email ? 'email-error' : undefined}
                  disabled={state.pending}
                  required
                />
                {state.errors.email && <small id="email-error">{state.errors.email}</small>}
              </label>
              <label className="form-field">
                <span>Contraseña</span>
                <span className="password-field">
                  <input
                    name="password"
                    type={state.showPassword ? 'text' : 'password'}
                    autoComplete={register ? 'new-password' : 'current-password'}
                    placeholder={register ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
                    value={state.password}
                    onChange={(event) => form.setPassword(event.target.value)}
                    aria-invalid={Boolean(state.errors.password)}
                    aria-describedby={state.errors.password ? 'password-error' : undefined}
                    disabled={state.pending}
                    required
                  />
                  <button
                    type="button"
                    onClick={form.togglePassword}
                    aria-label={state.showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {state.showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </span>
                {state.errors.password && (
                  <small id="password-error">{state.errors.password}</small>
                )}
              </label>
              {register && (
                <label className="form-field">
                  <span>Confirmar contraseña</span>
                  <input
                    name="confirmPassword"
                    type={state.showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repite la contraseña"
                    value={state.confirmPassword}
                    onChange={(event) => form.setConfirmPassword(event.target.value)}
                    aria-invalid={Boolean(state.errors.confirmPassword)}
                    aria-describedby={state.errors.confirmPassword ? 'confirm-error' : undefined}
                    disabled={state.pending}
                    required
                  />
                  {state.errors.confirmPassword && (
                    <small id="confirm-error">{state.errors.confirmPassword}</small>
                  )}
                </label>
              )}
              <button className="primary-button" type="submit" disabled={state.pending}>
                {state.pending && <LoaderCircle size={15} className="spin" />}
                {state.pending
                  ? register
                    ? 'Creando cuenta…'
                    : 'Ingresando…'
                  : register
                    ? 'Crear cuenta'
                    : 'Iniciar sesión'}
              </button>
            </form>
            <p className="auth-switch">
              {register ? '¿Ya tienes una cuenta?' : '¿Aún no tienes cuenta?'}{' '}
              <button
                type="button"
                className="text-button"
                onClick={() => onModeChange(register ? 'login' : 'register')}
              >
                {register ? 'Inicia sesión' : 'Crea una cuenta'}
              </button>
            </p>
            <p className="hint auth-privacy">
              <LockKeyhole size={13} aria-hidden="true" /> Tu correo es privado y no se muestra a
              otras personas.
            </p>
          </>
        )}
      </section>
    </main>
  )
}
