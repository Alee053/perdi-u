import { useState } from 'react'
import { UserRound } from 'lucide-react'
import type { AccountIdentity } from '@perdiu/contracts'

/** Display name is presentation only; without a profile, the e-mail's local part stands in. */
export const accountName = (account: AccountIdentity) =>
  account.displayName ?? account.email.split('@')[0]!

type UserAvatarProps = {
  account: AccountIdentity
  size?: 'small' | 'large'
}

export function UserAvatar({ account, size }: UserAvatarProps) {
  const [failed, setFailed] = useState<string>()
  const className = 'user-avatar' + (size ? ` user-avatar-${size}` : '')
  // A missing or broken photo falls back to the generic avatar.
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
      <UserRound size={size === 'large' ? 34 : 15} />
    </span>
  )
}
