import {
  ArrowUpRight,
  Bookmark,
  ClipboardList,
  House,
  LogIn,
  LogOut,
  Map,
  PawPrint,
  Plus,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { AccountIdentity } from '@perdiu/contracts'
import type { Section } from '../../types'

type SidebarProps = {
  section: Section
  mobileOpen: boolean
  activeCount: number
  ownCount: number
  savedCount: number
  onNavigate: (section: Section) => void
  onClose: () => void
  account: AccountIdentity | null
  onSignIn: () => void
  onSignOut: () => Promise<void>
}

export function Sidebar({
  section,
  mobileOpen,
  activeCount,
  ownCount,
  savedCount,
  onNavigate,
  onClose,
  account,
  onSignIn,
  onSignOut,
}: SidebarProps) {
  const go = (next: Section) => {
    onNavigate(next)
    onClose()
  }

  return (
    <aside className={'sidebar ' + (mobileOpen ? 'sidebar-open' : '')}>
      <a
        className="brand"
        href="#resumen"
        onClick={(event) => {
          event.preventDefault()
          go('overview')
        }}
        aria-label="PerdiU, resumen"
      >
        <span className="brand-mark">
          <PawPrint size={19} strokeWidth={2.2} />
        </span>
        <span className="brand-word">
          Perdi<span>U</span>
          <small>COMUNIDAD DE REENCUENTROS</small>
        </span>
      </a>
      <button className="sidebar-close" aria-label="Cerrar menú" onClick={onClose}>
        <X size={18} />
      </button>

      <div className="nav-label">GENERAL</div>
      <nav className="side-nav" aria-label="Navegación del panel">
        <NavItem
          active={section === 'overview'}
          icon={<House size={17} />}
          label="Resumen"
          onClick={() => go('overview')}
        />
        <NavItem
          active={section === 'explore'}
          icon={<Search size={17} />}
          label="Explorar reportes"
          badge={activeCount}
          onClick={() => go('explore')}
        />
        <NavItem
          active={section === 'map'}
          icon={<Map size={17} />}
          label="Mapa"
          onClick={() => go('map')}
        />
        <div className="nav-label nav-label-spaced">GESTIÓN</div>
        <NavItem
          active={section === 'publish'}
          icon={<Plus size={17} />}
          label="Publicar reporte"
          accent
          onClick={() => go('publish')}
        />
        <NavItem
          active={section === 'my-reports'}
          icon={<ClipboardList size={17} />}
          label="Mis reportes"
          badge={ownCount}
          onClick={() => go('my-reports')}
        />
        <NavItem
          active={section === 'saved'}
          icon={<Bookmark size={17} />}
          label="Guardados"
          badge={savedCount}
          onClick={() => go('saved')}
        />
        <div className="nav-label nav-label-spaced">CUENTA</div>
        <NavItem
          active={section === 'safety'}
          icon={<ShieldCheck size={17} />}
          label="Seguridad y privacidad"
          onClick={() => go('safety')}
        />
      </nav>

      <div className="sidebar-spacer" />
      <div className="sidebar-help">
        <span className="help-symbol">
          <ShieldCheck size={16} />
        </span>
        <div>
          <b>Encuentros seguros</b>
          <small>Revisa nuestros consejos</small>
        </div>
        <button onClick={() => go('safety')} aria-label="Ver consejos">
          <ArrowUpRight size={15} />
        </button>
      </div>
      {account ? (
        <button className="sidebar-user" onClick={() => void onSignOut()}>
          <span className="user-avatar">{account.email[0]!.toLocaleUpperCase('es')}</span>
          <span className="user-info">
            <b>{account.email}</b>
            <small>Cerrar sesión</small>
          </span>
          <LogOut size={15} />
        </button>
      ) : (
        <button className="sidebar-user" onClick={onSignIn}>
          <span className="user-avatar">
            <LogIn size={15} />
          </span>
          <span className="user-info">
            <b>Invitado</b>
            <small>Iniciar sesión o crear cuenta</small>
          </span>
        </button>
      )}
      <div className="sidebar-version">
        PERDIU · VERSIÓN DEMO <span>●</span>
      </div>
    </aside>
  )
}

function NavItem({
  active,
  icon,
  label,
  badge,
  accent,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  label: string
  badge?: number
  accent?: boolean
  onClick: () => void
}) {
  return (
    <button
      className={'nav-item ' + (active ? 'active ' : '') + (accent ? 'nav-item-accent' : '')}
      onClick={onClick}
    >
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
      {badge !== undefined && badge > 0 && <small>{badge}</small>}
    </button>
  )
}
