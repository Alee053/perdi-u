import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { CircleAlert, CheckCircle2, LoaderCircle, X } from 'lucide-react'
import { createAccountClient } from './auth/client'
import { createAuthGateway } from './auth/gateway'
import { AuthPresenter, signedOutNotice } from './auth/presenter'
import { AppHeader } from './components/layout/AppHeader'
import { Sidebar } from './components/layout/Sidebar'
import { createReportsClient } from './catalog/client'
import { CatalogPresenter, defaultCatalogFilters } from './catalog/presenter'
import { ReportDetail } from './components/reports/ReportDetail'
import { fallbackReportImage, initialReports } from './data/reports'
import { AuthPage, type AuthMode } from './pages/AuthPage'
import { ExplorePage } from './pages/ExplorePage'
import { MapPage } from './pages/MapPage'
import { MyReportsPage } from './pages/MyReportsPage'
import { OverviewPage } from './pages/OverviewPage'
import { ProfilePage } from './pages/ProfilePage'
import { PublishPage } from './pages/PublishPage'
import { SafetyPage } from './pages/SafetyPage'
import { SavedPage } from './pages/SavedPage'
import type { CatalogReport, Category, FilterStatus, Report, ReportStatus, Section } from './types'
import { normalizeText, sectionLabels } from './utils/text'

// One Auth client per page: a second instance would race to exchange the same PKCE code.
const authPresenter = (() => {
  const { gateway, accessToken } = createAuthGateway(import.meta.env.VITE_AUTH_URL || '/auth')
  const account = createAccountClient(import.meta.env.VITE_API_BASE_URL || '/api', accessToken)
  return new AuthPresenter(gateway, account)
})()

function App() {
  const [catalog] = useState(
    () => new CatalogPresenter(createReportsClient(import.meta.env.VITE_API_BASE_URL || '/api')),
  )
  const catalogState = useSyncExternalStore(catalog.subscribe, catalog.getSnapshot)
  const auth = authPresenter
  const authState = useSyncExternalStore(auth.subscribe, auth.getSnapshot)
  const [authView, setAuthView] = useState<AuthMode | null>(null)
  const [pendingSection, setPendingSection] = useState<Section | null>(null)
  const [section, setSection] = useState<Section>('overview')
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('Todas las ciudades')
  const [category, setCategory] = useState('Todas las categorías')
  const [status, setStatus] = useState<FilterStatus>('Todos')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [saved, setSaved] = useState<string[]>(['demo-3'])
  const [savedCatalogReports, setSavedCatalogReports] = useState<CatalogReport[]>([])
  const [mobileMenu, setMobileMenu] = useState(false)
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [postStatus, setPostStatus] = useState<ReportStatus>('Perdido')

  useEffect(() => {
    void auth.start()
  }, [auth])

  // Back/forward cache restores a frozen page; reload it so private data is verified again.
  useEffect(() => {
    const reload = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload()
    }
    window.addEventListener('pageshow', reload)
    return () => window.removeEventListener('pageshow', reload)
  }, [])

  // Private sections need a verified session; remember the destination for after login.
  useEffect(() => {
    if (auth.access(section) !== 'login') return
    setPendingSection(section)
    setSection('overview')
    setAuthView('login')
  }, [auth, authState, section])

  useEffect(() => {
    if (authState.status === 'authenticated' && authView) {
      setAuthView(null)
      setSection(pendingSection ?? 'overview')
      setPendingSection(null)
    } else if (
      authState.status === 'anonymous' &&
      authState.notice &&
      authState.notice !== signedOutNotice &&
      !authView
    )
      setAuthView('login')
    // Only state transitions open the login view; leaving it must not reopen it.
  }, [authState])

  useEffect(() => {
    void catalog.load({ search, city, category, status })
    return () => catalog.cancel()
  }, [catalog, search, city, category, status])

  const filteredReports = useMemo(
    () =>
      reports.filter((report) => {
        const text = normalizeText(
          report.title + ' ' + report.description + ' ' + report.zone + ' ' + report.city,
        )
        return (
          !report.resolved &&
          (!search || text.includes(normalizeText(search))) &&
          (city === 'Todas las ciudades' || report.city === city) &&
          (category === 'Todas las categorías' || report.category === category) &&
          (status === 'Todos' || report.status === status)
        )
      }),
    [reports, search, city, category, status],
  )

  const ownReports = reports.filter((report) => report.person === 'Santiago Demo')
  const catalogReports = catalogState.reports
  const savedReports = [...savedCatalogReports, ...reports].filter(
    (report) => saved.includes(report.id) && !report.resolved,
  )
  const activeReports = reports.filter((report) => !report.resolved)
  const lostCount = activeReports.filter((report) => report.status === 'Perdido').length
  const foundCount = activeReports.filter((report) => report.status === 'Encontrado').length
  const resolvedCount = reports.filter((report) => report.resolved).length

  const notify = (message: string, error = false) => {
    setNotice({ message, error })
    window.setTimeout(() => setNotice(null), 3800)
  }

  const navigate = (next: Section) => {
    if (auth.access(next) === 'login') {
      setPendingSection(next)
      setAuthView('login')
      setMobileMenu(false)
      return
    }
    setSection(next)
    setMobileMenu(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openAuth = (mode: AuthMode) => {
    setPendingSection(null)
    setAuthView(mode)
    setMobileMenu(false)
  }

  const signOut = async () => {
    const failure = await auth.signOut()
    if (failure) return notify(failure, true)
    // Private, per-account state must not survive the session.
    setSaved([])
    setSavedCatalogReports([])
    setSelectedReport(null)
    setImagePreview('')
    setSection('explore')
    setMobileMenu(false)
    notify(signedOutNotice)
  }

  const contact = (report: Report) => {
    if (report.source !== 'demo') return
    const message = encodeURIComponent(
      'Hola, vi tu reporte "' + report.title + '" en PerdiU. ¿Podemos coordinar?',
    )
    window.open(
      'https://wa.me/' + report.phone + '?text=' + message,
      '_blank',
      'noopener,noreferrer',
    )
  }

  const toggleSaved = (id: string) => {
    const report =
      catalogState.reports.find((item) => item.id === id) ??
      (selectedReport?.source === 'catalog' && selectedReport.id === id
        ? selectedReport
        : undefined)
    setSavedCatalogReports((items) => {
      const retained = items.filter((item) => item.id !== id)
      return !saved.includes(id) && report ? [...retained, report] : retained
    })
    setSaved((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]))
    notify(
      saved.includes(id)
        ? 'Quitaste este reporte de tus guardados.'
        : 'Guardaste este reporte para revisarlo después.',
    )
  }

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      notify('Elige una imagen JPG o PNG de máximo 5 MB.')
      return
    }
    setImagePreview(URL.createObjectURL(file))
  }

  const submitReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const newReport: Report = {
      id: 'demo-' + Date.now(),
      source: 'demo',
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim(),
      category: String(form.get('category') || 'Objeto') as Category,
      status: postStatus,
      city: String(form.get('city') || 'La Paz'),
      zone: String(form.get('zone') || 'Centro'),
      date: 'Hoy',
      posted: 'Ahora',
      image: imagePreview || fallbackReportImage,
      person: 'Santiago Demo',
      initials: 'SD',
      phone: '59170000000',
      color: 'lavender',
      position: { top: '48%', left: '48%' },
    }
    setReports((items) => [newReport, ...items])
    setImagePreview('')
    setSearch('')
    setCity('Todas las ciudades')
    setCategory('Todas las categorías')
    setStatus('Todos')
    navigate('my-reports')
    notify('Tu reporte ya está publicado. Puedes gestionarlo desde Mis reportes.')
  }

  const resetFilters = () => {
    setSearch(defaultCatalogFilters.search)
    setCity(defaultCatalogFilters.city)
    setCategory(defaultCatalogFilters.category)
    setStatus(defaultCatalogFilters.status)
  }

  const resolveReport = (report: Report) => {
    if (report.source !== 'demo') return
    setReports((items) =>
      items.map((item) => (item.id === report.id ? { ...item, resolved: true } : item)),
    )
    notify('Marcaste el reporte como resuelto; ya no aparecerá en las búsquedas.')
  }

  const removeReport = (report: Report) => {
    if (report.source !== 'demo') return
    setReports((items) => items.filter((item) => item.id !== report.id))
    setSaved((items) => items.filter((id) => id !== report.id))
    notify('El reporte se quitó de la lista.')
  }

  const account = authState.status === 'authenticated' ? authState.user : null
  const sectionAccess = auth.access(section)

  if (authView)
    return (
      <AuthPage
        key={authView}
        mode={authView}
        presenter={auth}
        notice={authState.status === 'anonymous' ? authState.notice : undefined}
        onModeChange={setAuthView}
        onBack={() => {
          setAuthView(null)
          setPendingSection(null)
          setSection('explore')
        }}
      />
    )

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="sidebar-scrim"
          onClick={() => setMobileMenu(false)}
          aria-label="Cerrar menú"
        />
      )}
      <Sidebar
        section={section}
        mobileOpen={mobileMenu}
        activeCount={catalogState.status === 'ready' ? catalogState.reports.length : 0}
        ownCount={ownReports.length}
        savedCount={saved.length}
        onNavigate={navigate}
        onClose={() => setMobileMenu(false)}
        account={account}
        onSignIn={() => openAuth('login')}
      />

      <div className="main-column">
        <AppHeader
          sectionTitle={sectionLabels[section]}
          onOpenMenu={() => setMobileMenu(true)}
          onNotify={notify}
          account={account}
          restoring={authState.status === 'restoring'}
          onSignIn={() => openAuth('login')}
          onRegister={() => openAuth('register')}
          onOpenProfile={() => navigate('profile')}
          onSignOut={signOut}
        />
        <main className="content-area">
          {sectionAccess === 'wait' && (
            <div className="session-wait" role="status">
              <LoaderCircle size={16} className="spin" /> Verificando tu sesión…
            </div>
          )}
          {section === 'overview' && (
            <OverviewPage
              reports={activeReports}
              lostCount={lostCount}
              foundCount={foundCount}
              resolvedCount={resolvedCount}
              ownCount={ownReports.length}
              onNavigate={navigate}
              onOpen={setSelectedReport}
              saved={saved}
              onSave={toggleSaved}
            />
          )}
          {section === 'explore' && (
            <ExplorePage
              reports={catalogReports}
              catalogState={catalogState}
              onRetry={() => void catalog.load()}
              search={search}
              setSearch={setSearch}
              city={city}
              setCity={setCity}
              category={category}
              setCategory={setCategory}
              status={status}
              setStatus={setStatus}
              resetFilters={resetFilters}
              onOpen={setSelectedReport}
              saved={saved}
              onSave={toggleSaved}
              onNavigate={navigate}
            />
          )}
          {section === 'map' && (
            <MapPage
              reports={filteredReports}
              city={city}
              setCity={setCity}
              category={category}
              setCategory={setCategory}
              status={status}
              setStatus={setStatus}
              onOpen={setSelectedReport}
              onNavigate={navigate}
            />
          )}
          {section === 'publish' && sectionAccess === 'allow' && (
            <PublishPage
              postStatus={postStatus}
              setPostStatus={setPostStatus}
              imagePreview={imagePreview}
              setImagePreview={setImagePreview}
              choosePhoto={choosePhoto}
              onSubmit={submitReport}
            />
          )}
          {section === 'my-reports' && sectionAccess === 'allow' && (
            <MyReportsPage
              reports={ownReports}
              onResolve={resolveReport}
              onRemove={removeReport}
              onOpen={setSelectedReport}
              onNavigate={navigate}
            />
          )}
          {section === 'saved' && (
            <SavedPage
              reports={savedReports}
              onSave={toggleSaved}
              onOpen={setSelectedReport}
              onNavigate={navigate}
              saved={saved}
            />
          )}
          {section === 'safety' && <SafetyPage />}
          {section === 'profile' && sectionAccess === 'allow' && account && (
            <ProfilePage account={account} onNavigate={navigate} onSignOut={signOut} />
          )}
        </main>
        <footer className="app-footer">
          <span>PerdiU · Bolivia</span>
          <span>
            Lo importante siempre encuentra el camino <b>♡</b>
          </span>
          <button onClick={() => navigate('safety')}>Privacidad y seguridad</button>
        </footer>
      </div>

      {notice && (
        <div
          className={'toast' + (notice.error ? ' toast-error' : '')}
          role={notice.error ? 'alert' : 'status'}
        >
          {notice.error ? <CircleAlert size={17} /> : <CheckCircle2 size={17} />} {notice.message}
          <button onClick={() => setNotice(null)} aria-label="Cerrar aviso">
            <X size={14} />
          </button>
        </div>
      )}
      {selectedReport && (
        <ReportDetail
          report={selectedReport}
          saved={saved.includes(selectedReport.id)}
          onSave={() => toggleSaved(selectedReport.id)}
          onContact={selectedReport.source === 'demo' ? () => contact(selectedReport) : undefined}
          onResolve={() => resolveReport(selectedReport)}
          onClose={() => setSelectedReport(null)}
          isOwn={selectedReport.source === 'demo' && selectedReport.person === 'Santiago Demo'}
        />
      )}
    </div>
  )
}

export default App
