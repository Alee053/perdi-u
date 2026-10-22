import { createAuthGateway } from '../infrastructure/auth/supabase-gateway.js'
import { browserEffects } from '../infrastructure/browser/browser-effects.js'
import { demoReports, demoSavedIds } from '../infrastructure/demo/demo-reports.js'
import { createAccountClient } from '../infrastructure/http/account-client.js'
import {
  createReportDetailClient,
  createReportsClient,
} from '../infrastructure/http/catalog-client.js'
import { createReportPublisher } from '../infrastructure/http/publish-client.js'
import { NoticePresenter } from '../presenters/app/notice.presenter.js'
import { ShellPresenter } from '../presenters/app/shell.presenter.js'
import { AuthPresenter } from '../presenters/auth/auth.presenter.js'
import { CatalogPresenter } from '../presenters/catalog/catalog.presenter.js'
import { FiltersPresenter } from '../presenters/catalog/filters.presenter.js'
import { PublishPresenter } from '../presenters/reports/publish.presenter.js'
import { ReportDetailPresenter } from '../presenters/reports/report-detail.presenter.js'
import { ReportsPresenter } from '../presenters/reports/reports.presenter.js'

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
  const reports: ReportsPresenter = new ReportsPresenter(
    demoReports,
    {
      // A report opened by its link can be saved even if the catalog never listed it.
      catalog: { find: (id) => catalog.find(id) ?? reportDetail.find(id) },
      notices,
      effects: browserEffects,
      links: { open: (id) => void reportDetail.open(id) },
    },
    demoSavedIds,
  )
  const reportDetail = new ReportDetailPresenter({
    repository: createReportDetailClient(apiUrl, accessToken),
    auth,
    effects: browserEffects,
    onLoginRequired: () => shell.openAuth('login'),
    isSaved: (id) => reports.isSaved(id),
  })
  const publish = new PublishPresenter({
    publisher: createReportPublisher(apiUrl, accessToken),
    filters,
    notices,
    onPublished: () => shell.navigate('explore'),
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
  return { auth, notices, catalog, filters, reports, reportDetail, publish, shell }
}

export type Presenters = ReturnType<typeof createPresenters>
