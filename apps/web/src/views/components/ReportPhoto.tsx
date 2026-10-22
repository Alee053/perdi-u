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
  return (
    <img
      src={photo.source}
      alt={photo.failed ? 'Foto no disponible' : alt}
      className={className}
      loading={loading}
    />
  )
}
