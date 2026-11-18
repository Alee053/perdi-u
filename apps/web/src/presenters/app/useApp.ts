import { useEffect } from 'react'
import type { AuthPresenter } from '../auth/auth.presenter.js'
import type { CatalogPresenter } from '../catalog/catalog.presenter.js'
import { filterOptions, type FiltersPresenter } from '../catalog/filters.presenter.js'
import type { CatalogSearchPresenter } from '../catalog/search.presenter.js'
import type { PublishPresenter } from '../reports/publish.presenter.js'
import type { ReportDetailPresenter } from '../reports/report-detail.presenter.js'
import type { ReportsPresenter } from '../reports/reports.presenter.js'
import type { OwnReportsPresenter } from '../reports/own-reports.presenter.js'
import { useStore } from '../useStore.js'
import type { NoticePresenter } from './notice.presenter.js'
import type { ShellPresenter } from './shell.presenter.js'

export interface AppPresenters {
  auth: AuthPresenter
  notices: NoticePresenter
  catalog: CatalogPresenter
  filters: FiltersPresenter
  search: CatalogSearchPresenter
  reports: ReportsPresenter
  own: OwnReportsPresenter
  reportDetail: ReportDetailPresenter
  publish: PublishPresenter
  shell: ShellPresenter
}

/**
 * React adapter of the dashboard. It subscribes the view to the presenter cores, ties their
 * start/cleanup to the component lifecycle and hands the view ready-to-render data and actions.
 */
export function useApp(presenters: AppPresenters) {
  const { auth, notices, catalog, filters, search, reports, own, reportDetail, publish, shell } =
    presenters
  const shellState = useStore(shell)
  // Subscriptions only: their data is read below through shell.view() and the reports selectors.
  useStore(auth)
  useStore(reports)
  useStore(own)
  useStore(reportDetail)
  const notice = useStore(notices)
  const catalogState = useStore(catalog)
  const selection = useStore(filters)
  const publishState = useStore(publish)

  useEffect(() => shell.start(), [shell])
  useEffect(() => reportDetail.start(), [reportDetail])
  useEffect(() => own.start(auth), [own, auth])
  useEffect(() => search.start(), [search])

  const counts = reports.counts()
  return {
    shell: { ...shellState, ...shell.view() },
    notice,
    counts: {
      active: catalogState.status === 'ready' ? catalogState.reports.length : 0,
      ...counts,
      own: own.view().total,
    },
    catalog: catalog.view(),
    selection,
    filterOptions,
    overview: reports.overview(),
    map: reports.mapView(),
    myReports: own.view(),
    saved: reports.saved(),
    detail: reports.detail(),
    reportLink: reportDetail.view(),
    publish: publishState,
    isSaved: reports.isSaved,
    auth,
    actions: {
      navigate: shell.navigate,
      openAuth: shell.openAuth,
      switchAuthMode: shell.switchAuthMode,
      closeAuth: shell.closeAuth,
      openMenu: shell.openMenu,
      closeMenu: shell.closeMenu,
      signOut: shell.signOut,
      dismissNotice: notices.dismiss,
      retryCatalog: () => void catalog.load(),
      filters,
      reports,
      own,
      reportLink: {
        close: reportDetail.close,
        retry: () => void reportDetail.retry(),
        contact: () => void reportDetail.contact(),
        copyLink: () => void reportDetail.copyLink(),
        selectPhoto: reportDetail.selectPhoto,
        nextPhoto: reportDetail.nextPhoto,
        previousPhoto: reportDetail.previousPhoto,
      },
      publish,
    },
  }
}

export type AppView = ReturnType<typeof useApp>
