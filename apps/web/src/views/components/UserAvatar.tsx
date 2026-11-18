import { useState } from 'react'
import { UserRound } from 'lucide-react'

type UserAvatarProps = {
  photoUrl?: string
  size?: 'small' | 'large'
  onImageError?: () => void
}

export function UserAvatar({ photoUrl, size, onImageError }: UserAvatarProps) {
  // Visual fallback only: a missing or broken photo shows the generic avatar.
  const [failed, setFailed] = useState<string>()
  const className = 'user-avatar' + (size ? ` user-avatar-${size}` : '')
  if (photoUrl && failed !== photoUrl)
    return (
      <img
        className={className}
        src={photoUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={onImageError ?? (() => setFailed(photoUrl))}
      />
    )
  return (
    <span className={className} aria-hidden="true">
      <UserRound size={size === 'large' ? 32 : 15} />
    </span>
  )
}
