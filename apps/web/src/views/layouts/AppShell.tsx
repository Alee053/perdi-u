import { LoaderCircle } from 'lucide-react'
import type { AppView } from '../../presenters/app/useApp'
import { ReportDetail } from '../components/ReportDetail'
import { Toast } from '../components/Toast'
import { AuthPage } from '../pages/AuthPage'
import { ExplorePage } from '../pages/ExplorePage'
import { MapPage } from '../pages/MapPage'
import { MyReportsPage } from '../pages/MyReportsPage'
import { OverviewPage } from '../pages/OverviewPage'
import { ProfilePage } from '../pages/ProfilePage'
import { PublishPage } from '../pages/PublishPage'
import { SafetyPage } from '../pages/SafetyPage'
import { SavedPage } from '../pages/SavedPage'
import { AppHeader } from './AppHeader'
import { Sidebar } from './Sidebar'

/** Dashboard frame: shows the section chosen by the shell presenter and its shared overlays. */
export function AppShell({ app }: { app: AppView }) {
  const { shell, actions, detail } = app
  const { reports } = actions
  const cards = { isSaved: app.isSaved, onSave: reports.toggleSaved, onOpen: reports.open }

  if (shell.authView)
    return (
      <AuthPage
        key={shell.authView}
        mode={shell.authView}
        auth={app.auth}
        notice={shell.authNotice}
        onModeChange={actions.switchAuthMode}
        onBack={actions.closeAuth}
      />
    )

  return (
    <div className="app-shell">
      {shell.menuOpen && (
        <button className="sidebar-scrim" onClick={actions.closeMenu} aria-label="Cerrar menú" />
      )}
      <Sidebar
        section={shell.section}
        open={shell.menuOpen}
        counts={app.counts}
        account={shell.account}
        onNavigate={actions.navigate}
        onClose={actions.closeMenu}
        onSignIn={() => actions.openAuth('login')}
      />
      <div className="main-column">
        <AppHeader
          title={shell.title}
          account={shell.account}
          restoring={shell.restoring}
          signingOut={shell.signingOut}
          onOpenMenu={actions.openMenu}
          onSignIn={() => actions.openAuth('login')}
          onRegister={() => actions.openAuth('register')}
          onOpenProfile={() => actions.navigate('profile')}
          onSignOut={actions.signOut}
        />
        <main className="content">
          {shell.access === 'wait' && (
            <p className="session-wait" role="status">
              <LoaderCircle size={16} className="spin" /> Verificando tu sesión…
            </p>
          )}
          {shell.section === 'overview' && (
            <OverviewPage overview={app.overview} onNavigate={actions.navigate} {...cards} />
          )}
          {shell.section === 'explore' && (
            <ExplorePage
              catalog={app.catalog}
              selection={app.selection}
              filters={actions.filters}
              onRetry={actions.retryCatalog}
              onNavigate={actions.navigate}
              {...cards}
            />
          )}
          {shell.section === 'map' && (
            <MapPage
              map={app.map}
              selection={app.selection}
              filters={actions.filters}
              onOpen={reports.open}
              onNavigate={actions.navigate}
            />
          )}
          {shell.section === 'publish' && shell.access === 'allow' && (
            <PublishPage form={app.publish} actions={actions.publish} />
          )}
          {shell.section === 'my-reports' && shell.access === 'allow' && (
            <MyReportsPage
              myReports={app.myReports}
              onFilter={reports.setOwnFilter}
              onResolve={reports.resolve}
              onRemove={reports.remove}
              onOpen={reports.open}
              onNavigate={actions.navigate}
            />
          )}
          {shell.section === 'saved' && (
            <SavedPage reports={app.saved} onNavigate={actions.navigate} {...cards} />
          )}
          {shell.section === 'safety' && <SafetyPage />}
          {shell.section === 'profile' && shell.access === 'allow' && shell.account && (
            <ProfilePage
              account={shell.account}
              signingOut={shell.signingOut}
              onNavigate={actions.navigate}
              onSignOut={actions.signOut}
            />
          )}
        </main>
        <footer className="app-footer">
          <span>PerdiU · Bolivia</span>
          <button className="text-button" onClick={() => actions.navigate('safety')}>
            Privacidad y seguridad
          </button>
        </footer>
      </div>
      {app.notice && <Toast notice={app.notice} onClose={actions.dismissNotice} />}
      {detail && (
        <ReportDetail
          detail={detail}
          onSave={() => reports.toggleSaved(detail.card.id)}
          onContact={() => reports.contact(detail.card.id)}
          onResolve={() => reports.resolve(detail.card.id)}
          onClose={reports.close}
        />
      )}
    </div>
  )
}
