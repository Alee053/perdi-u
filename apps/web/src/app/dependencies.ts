import { createAuthGateway } from '../infrastructure/auth/supabase-gateway.js'
import { browserEffects } from '../infrastructure/browser/browser-effects.js'
import { demoReports, demoSavedIds } from '../infrastructure/demo/demo-reports.js'
import { createAccountClient } from '../infrastructure/http/account-client.js'
import { createReportsClient } from '../infrastructure/http/catalog-client.js'
import { createOwnReportsClient } from '../infrastructure/http/own-reports-client.js'
import { NoticePresenter } from '../presenters/app/notice.presenter.js'
import { ShellPresenter } from '../presenters/app/shell.presenter.js'
import { AuthPresenter } from '../presenters/auth/auth.presenter.js'
import { CatalogPresenter } from '../presenters/catalog/catalog.presenter.js'
import { FiltersPresenter } from '../presenters/catalog/filters.presenter.js'
import { PublishPresenter } from '../presenters/reports/publish.presenter.js'
import { ReportsPresenter } from '../presenters/reports/reports.presenter.js'
import { OwnReportsPresenter } from '../presenters/reports/own-reports.presenter.js'

/**
 * Composition root: the only module that knows the concrete adapters. It builds the
 * infrastructure, injects it into the presenters and connects the presenters with each other.
 */
export function createPresenters(env = import.meta.env) {
  const apiUrl = env.VITE_API_BASE_URL || '/api'
  const { gateway, accessToken } = createAuthGateway(env.VITE_AUTH_URL || '/auth')

  const auth = new AuthPresenter(gateway, createAccountClient(apiUrl, accessToken))
  const notices = new NoticePresenter(browserEffects)
  const catalog = new CatalogPresenter(createReportsClient(apiUrl))
  const filters = new FiltersPresenter((selection) => void catalog.load(selection))
  const own: OwnReportsPresenter = new OwnReportsPresenter(
    createOwnReportsClient(apiUrl, accessToken),
    {
      notices,
      onSessionRejected: () => auth.requireSignIn(),
      onOwnerChanged: () => {
        reports.clearPrivateData()
        publish.reset()
      },
      onResolved: (report) => {
        reports.markResolved(report.id)
        catalog.removeResolved(report.id)
        void catalog.load()
      },
    },
  )
  const reports: ReportsPresenter = new ReportsPresenter(
    demoReports,
    { catalog, own, notices, effects: browserEffects },
    demoSavedIds,
  )
  const publish = new PublishPresenter({
    reports,
    filters,
    notices,
    effects: browserEffects,
    onPublished: () => shell.navigate('overview'),
  })
  const shell: ShellPresenter = new ShellPresenter({
    auth,
    notices,
    effects: browserEffects,
    onSignedOut: () => {
      reports.clearPrivateData()
      publish.reset()
    },
  })
  return { auth, notices, catalog, filters, reports, own, publish, shell }
}

export type Presenters = ReturnType<typeof createPresenters>
