import { useState } from 'react'
import { UserRound } from 'lucide-react'
import type { AccountView } from '../../presenters/app/shell.presenter'

type UserAvatarProps = {
  account: AccountView
  size?: 'small' | 'large'
}

export function UserAvatar({ account, size }: UserAvatarProps) {
  // Visual fallback only: a missing or broken photo shows the generic avatar.
  const [failed, setFailed] = useState<string>()
  const className = 'user-avatar' + (size ? ` user-avatar-${size}` : '')
  if (account.photoUrl && failed !== account.photoUrl)
    return (
      <img
        className={className}
        src={account.photoUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(account.photoUrl)}
      />
    )
  return (
    <span className={className} aria-hidden="true">
      <UserRound size={size === 'large' ? 32 : 15} />
    </span>
  )
}
