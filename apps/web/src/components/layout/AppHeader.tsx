import { useState } from 'react'
import { Bell, ChevronDown, ChevronRight, LogIn, LogOut, MapPin, Menu } from 'lucide-react'
import type { AccountIdentity } from '@perdiu/contracts'

type AppHeaderProps = {
  sectionTitle: string
  onOpenMenu: () => void
  onNotify: (message: string) => void
  account: AccountIdentity | null
  restoring: boolean
  onSignIn: () => void
  onRegister: () => void
  onSignOut: () => Promise<void>
}

export function AppHeader({
  sectionTitle,
  onOpenMenu,
  onNotify,
  account,
  restoring,
  onSignIn,
  onRegister,
  onSignOut,
}: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

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
        {account ? (
          <div className="account-menu">
            <button
              className="header-profile"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="user-avatar user-avatar-small">
                {account.email[0]!.toLocaleUpperCase('es')}
              </span>
              <span className="header-profile-name">{account.email}</span>
              <ChevronDown size={13} />
            </button>
            {menuOpen && (
              <div className="account-menu-popover" role="menu">
                <p>{account.email}</p>
                <button
                  className="secondary-button"
                  role="menuitem"
                  disabled={signingOut}
                  onClick={async () => {
                    setSigningOut(true)
                    await onSignOut()
                    setSigningOut(false)
                    setMenuOpen(false)
                  }}
                >
                  <LogOut size={14} /> {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
                </button>
              </div>
            )}
          </div>
        ) : restoring ? (
          <span className="header-profile" aria-live="polite">
            Verificando sesión…
          </span>
        ) : (
          <>
            <button className="header-profile header-profile-name" onClick={onRegister}>
              Crear cuenta
            </button>
            <button className="primary-button" onClick={onSignIn}>
              <LogIn size={14} /> Iniciar sesión
            </button>
          </>
        )}
      </div>
    </header>
  )
}
