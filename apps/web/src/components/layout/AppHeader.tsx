import { Bell, ChevronDown, ChevronRight, MapPin, Menu } from 'lucide-react'

type AppHeaderProps = {
  sectionTitle: string
  onOpenMenu: () => void
  onNotify: (message: string) => void
}

export function AppHeader({ sectionTitle, onOpenMenu, onNotify }: AppHeaderProps) {
  return (
    <header className="app-header">
      <button className="mobile-menu-toggle" aria-label="Abrir menú" onClick={onOpenMenu}>
        <Menu size={20} />
      </button>
      <div className="breadcrumbs">
        <span>PerdiU</span>
        <ChevronRight size={14} />
        <b>{sectionTitle}</b>
      </div>
      <div className="header-tools">
        <div className="header-city">
          <MapPin size={14} />
          <span>Bolivia</span>
          <ChevronDown size={13} />
        </div>
        <button
          className="header-icon-button"
          aria-label="Notificaciones"
          onClick={() => onNotify('No tienes notificaciones nuevas.')}
        >
          <Bell size={17} />
          <i />
        </button>
        <span className="header-divider" />
        <button
          className="header-profile"
          onClick={() => onNotify('Perfil de demostración conectado.')}
        >
          <span className="user-avatar user-avatar-small">S</span>
          <span>Santiago</span>
          <ChevronDown size={13} />
        </button>
      </div>
    </header>
  )
}
