import { useReportPhoto } from '../../presenters/reports/useReportPhoto'

export function ReportPhoto({
  src,
  privatePhoto,
  alt,
  className,
  loading,
}: {
  src: string
  privatePhoto: boolean
  alt: string
  className?: string
  loading?: 'eager' | 'lazy'
}) {
  const photo = useReportPhoto(src, privatePhoto)
  if (photo.failed)
    return (
      <span className={className} role="img" aria-label="Foto no disponible">
        Foto no disponible
      </span>
    )
  return (
    <img
      src={photo.source}
      alt={alt}
      className={className}
      loading={loading}
      onError={photo.onError}
    />
  )
}
