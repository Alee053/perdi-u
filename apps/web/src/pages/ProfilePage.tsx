import { useState } from 'react'
import { ChevronRight, ClipboardList, Lock, LogOut, Mail } from 'lucide-react'
import type { AccountIdentity } from '@perdiu/contracts'
import type { Section } from '../types'
import { PageHeading } from '../components/common/PageHeading'
import { UserAvatar, accountName } from '../components/common/UserAvatar'

type ProfilePageProps = {
  account: AccountIdentity
  onNavigate: (section: Section) => void
  onSignOut: () => Promise<void>
}

export function ProfilePage({ account, onNavigate, onSignOut }: ProfilePageProps) {
  const [signingOut, setSigningOut] = useState(false)

  return (
    <>
      <PageHeading
        eyebrow="TU CUENTA"
        title="Mi perfil"
        description="Revisa los datos con los que usas PerdiU."
      />
      <section className="profile-card" aria-label="Datos de tu cuenta">
        <UserAvatar account={account} size="large" />
        <div className="profile-identity">
          <h2>{accountName(account)}</h2>
          <p>
            <Mail size={14} /> {account.email}
          </p>
          <small>
            <Lock size={12} /> Tu correo es privado: solo tú lo ves aquí.
          </small>
        </div>
      </section>
      <div className="profile-actions">
        <button className="profile-link" onClick={() => onNavigate('my-reports')}>
          <span className="own-summary-icon">
            <ClipboardList size={18} />
          </span>
          <span>
            <b>Mis reportes</b>
            <small>Consulta el título, el tipo y el estado de tus publicaciones.</small>
          </span>
          <ChevronRight size={16} />
        </button>
        <button
          className="secondary-button"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true)
            await onSignOut()
            setSigningOut(false)
          }}
        >
          <LogOut size={14} /> {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
      </div>
    </>
  )
}
