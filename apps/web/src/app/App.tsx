import { useApp } from '../presenters/app/useApp'
import { AppShell } from '../views/layouts/AppShell'
import { createPresenters } from './dependencies'

// One Auth client per page: a second instance would race to exchange the same PKCE code.
const presenters = createPresenters()

/** Entry component: connects the composed presenters with the dashboard view. */
export function App() {
  return <AppShell app={useApp(presenters)} />
}
