import { X } from 'lucide-react'
import type { Section } from '../../presenters/app/sections'
import type { AccountView } from '../../presenters/app/shell.presenter'

type SidebarProps = {
  section: Section
  open: boolean
  counts: { active: number; own: number; saved: number }
  account: AccountView | null
  onNavigate: (section: Section) => void
  onClose: () => void
  onSignIn: () => void
}

const items: { section: Section; label: string }[] = [
  { section: 'overview', label: 'Resumen' },
  { section: 'explore', label: 'Explorar reportes' },
  { section: 'map', label: 'Mapa' },
  { section: 'publish', label: 'Publicar reporte' },
  { section: 'my-reports', label: 'Mis reportes' },
  { section: 'saved', label: 'Guardados' },
  { section: 'profile', label: 'Mi perfil' },
  { section: 'safety', label: 'Seguridad y privacidad' },
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
          PerdiU
        </button>
        <button className="sidebar-close" aria-label="Cerrar menú" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <nav aria-label="Navegación del panel">
        {items.map((item) => (
          <button
            key={item.section}
            className={'nav-item' + (section === item.section ? ' active' : '')}
            aria-current={section === item.section ? 'page' : undefined}
            onClick={() => onNavigate(item.section)}
          >
            <span>{item.label}</span>
            {Boolean(badges[item.section]) && <small>{badges[item.section]}</small>}
          </button>
        ))}
      </nav>
      {account ? (
        <button className="sidebar-user" onClick={() => onNavigate('profile')}>
          <b>{account.name}</b>
          <small>Ver mi perfil</small>
        </button>
      ) : (
        <button className="sidebar-user" onClick={onSignIn}>
          <b>Invitado</b>
          <small>Iniciar sesión o crear cuenta</small>
        </button>
      )}
    </aside>
  )
}
