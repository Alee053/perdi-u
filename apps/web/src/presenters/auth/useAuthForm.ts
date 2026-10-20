import { useState } from 'react'
import { useStore } from '../useStore.js'
import { AuthFormPresenter, type AuthMode } from './auth-form.presenter.js'
import type { AuthPresenter } from './auth.presenter.js'

/** One form presenter per mounted screen; the view is keyed by mode, so a new mode starts clean. */
export function useAuthForm(mode: AuthMode, auth: AuthPresenter) {
  const [form] = useState(() => new AuthFormPresenter(mode, auth))
  return { state: useStore(form), form }
}
