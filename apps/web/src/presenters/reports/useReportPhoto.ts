import { createContext, useContext, useEffect, useMemo } from 'react'
import type { ReportPhotoLoader } from '../../models/reports/photo.js'
import { useStore } from '../useStore.js'
import { ReportPhotoPresenter } from './report-photo.presenter.js'

export const ReportPhotoContext = createContext<ReportPhotoLoader | null>(null)

export function useReportPhoto(source: string, privatePhoto: boolean) {
  const loader = useContext(ReportPhotoContext)
  if (!loader) throw new Error('Falta el cargador de fotos del reporte.')
  const presenter = useMemo(() => new ReportPhotoPresenter(loader), [loader])
  const photo = useStore(presenter)
  useEffect(() => {
    void presenter.show(source, privatePhoto)
    return presenter.stop
  }, [presenter, source, privatePhoto])
  return photo
}
