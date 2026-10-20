import {
  Bookmark,
  ClipboardList,
  House,
  LogIn,
  Map,
  PawPrint,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { Section } from '../../presenters/app/sections'
import type { AccountView } from '../../presenters/app/shell.presenter'
import { UserAvatar } from '../components/UserAvatar'

type SidebarProps = {
  section: Section
  open: boolean
  counts: { active: number; own: number; saved: number }
  account: AccountView | null
  onNavigate: (section: Section) => void
  onClose: () => void
  onSignIn: () => void
}

const groups: { label: string; items: { section: Section; label: string; icon: ReactNode }[] }[] = [
  {
    label: 'General',
    items: [
      { section: 'overview', label: 'Resumen', icon: <House size={17} /> },
      { section: 'explore', label: 'Explorar reportes', icon: <Search size={17} /> },
      { section: 'map', label: 'Mapa', icon: <Map size={17} /> },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { section: 'publish', label: 'Publicar reporte', icon: <Plus size={17} /> },
      { section: 'my-reports', label: 'Mis reportes', icon: <ClipboardList size={17} /> },
      { section: 'saved', label: 'Guardados', icon: <Bookmark size={17} /> },
    ],
  },
  {
    label: 'Cuenta',
    items: [
      { section: 'profile', label: 'Mi perfil', icon: <UserRound size={17} /> },
      { section: 'safety', label: 'Seguridad y privacidad', icon: <ShieldCheck size={17} /> },
    ],
  },
]

export function Sidebar({
  section,
  open,
  counts,
  account,
  onNavigate,
  onClose,
  onSignIn,
}: SidebarProps) {
  const badges: Partial<Record<Section, number>> = {
    explore: counts.active,
    'my-reports': counts.own,
    saved: counts.saved,
  }
  return (
    <aside className={'sidebar' + (open ? ' sidebar-open' : '')}>
      <div className="sidebar-top">
        <button
          className="brand"
          onClick={() => onNavigate('overview')}
          aria-label="PerdiU, resumen"
        >
          <span className="brand-mark" aria-hidden="true">
            <PawPrint size={18} />
          </span>
          <span className="brand-word">
            Perdi<span>U</span>
          </span>
        </button>
        <button className="sidebar-close" aria-label="Cerrar menú" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <nav aria-label="Navegación del panel">
        {groups.map((group) => (
          <div className="nav-group" key={group.label}>
            <span className="nav-label">{group.label}</span>
            {group.items.map((item) => (
              <button
                key={item.section}
                className={'nav-item' + (section === item.section ? ' active' : '')}
                aria-current={section === item.section ? 'page' : undefined}
                onClick={() => onNavigate(item.section)}
              >
                {item.icon}
                <span>{item.label}</span>
                {Boolean(badges[item.section]) && <small>{badges[item.section]}</small>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      {account ? (
        <button className="sidebar-user" onClick={() => onNavigate('profile')}>
          <UserAvatar account={account} />
          <span>
            <b>{account.name}</b>
            <small>Ver mi perfil</small>
          </span>
        </button>
      ) : (
        <button className="sidebar-user" onClick={onSignIn}>
          <span className="user-avatar" aria-hidden="true">
            <LogIn size={15} />
          </span>
          <span>
            <b>Invitado</b>
            <small>Iniciar sesión o crear cuenta</small>
          </span>
        </button>
      )}
    </aside>
  )
}
