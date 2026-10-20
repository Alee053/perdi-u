import { useState } from 'react'
import { Menu } from 'lucide-react'
import type { AccountView } from '../../presenters/app/shell.presenter'
import { UserAvatar } from '../components/UserAvatar'

type AppHeaderProps = {
  title: string
  account: AccountView | null
  restoring: boolean
  signingOut: boolean
  onOpenMenu: () => void
  onSignIn: () => void
  onRegister: () => void
  onOpenProfile: () => void
  onSignOut: () => void
}

export function AppHeader({
  title,
  account,
  restoring,
  signingOut,
  onOpenMenu,
  onSignIn,
  onRegister,
  onOpenProfile,
  onSignOut,
}: AppHeaderProps) {
  // Whether the account popover is open is purely visual, so it stays in the view.
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="app-header">
      <button className="menu-toggle" aria-label="Abrir menú" onClick={onOpenMenu}>
        <Menu size={20} />
      </button>
      <span className="header-title">{title}</span>
      <div className="header-tools">
        {account ? (
          <div className="account-menu">
            <button
              className="header-account"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <UserAvatar account={account} size="small" />
              <span className="header-account-name">{account.name}</span>
            </button>
            {menuOpen && (
              <div className="account-popover" role="menu">
                <p>{account.email}</p>
                <button
                  className="secondary-button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenProfile()
                  }}
                >
                  Mi perfil
                </button>
                <button
                  className="secondary-button"
                  role="menuitem"
                  disabled={signingOut}
                  onClick={onSignOut}
                >
                  {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
                </button>
              </div>
            )}
          </div>
        ) : restoring ? (
          <span className="header-status" aria-live="polite">
            Verificando sesión…
          </span>
        ) : (
          <>
            <button className="text-button header-register" onClick={onRegister}>
              Crear cuenta
            </button>
            <button className="primary-button" onClick={onSignIn}>
              Iniciar sesión
            </button>
          </>
        )}
      </div>
    </header>
  )
}
