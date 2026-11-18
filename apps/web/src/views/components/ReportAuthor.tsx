import { useAuthorPhoto } from '../../presenters/reports/useReportPhoto'
import { UserAvatar } from './UserAvatar'

function PublicAuthorAvatar({ photoUrl }: { photoUrl: string }) {
  const photo = useAuthorPhoto(photoUrl)
  return <UserAvatar photoUrl={photo.source} size="small" onImageError={photo.onError} />
}

export function ReportAuthor({ name, photoUrl }: { name: string; photoUrl?: string }) {
  return (
    <span className="report-author">
      {photoUrl && <PublicAuthorAvatar key={photoUrl} photoUrl={photoUrl} />}
      <span>{name}</span>
    </span>
  )
}
