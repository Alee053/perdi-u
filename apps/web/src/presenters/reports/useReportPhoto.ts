import { createContext, useContext, useEffect, useMemo } from 'react'
import type { ReportPhotoLoader } from '../../models/reports/photo.js'
import { useStore } from '../useStore.js'
import { ReportPhotoPresenter } from './report-photo.presenter.js'

type PhotoLoaders = {
  report: ReportPhotoLoader
  avatar: ReportPhotoLoader
}

export const ReportPhotoContext = createContext<PhotoLoaders | null>(null)

function usePhotoLoaders() {
  const loaders = useContext(ReportPhotoContext)
  if (!loaders) throw new Error('Faltan los cargadores de fotos.')
  return loaders
}

function usePhoto(source: string, loader: ReportPhotoLoader, loadResource: boolean) {
  const presenter = useMemo(() => new ReportPhotoPresenter(loader), [loader])
  const photo = useStore(presenter)
  useEffect(() => {
    void presenter.show(source, loadResource)
    return presenter.stop
  }, [presenter, source, loadResource])
  return { ...photo, onError: presenter.imageFailed }
}

export function useReportPhoto(source: string, privatePhoto: boolean) {
  return usePhoto(source, usePhotoLoaders().report, privatePhoto)
}

export function useAuthorPhoto(source: string) {
  return usePhoto(source, usePhotoLoaders().avatar, true)
}
