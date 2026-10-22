import {
  ReportPublishFailure,
  isAcceptedPhoto,
  maxPhotoCount,
  validateDraft,
  type ReportMediaClient,
  type ReportPhotoFile,
  type DraftField,
  type DraftIssue,
  type ReportDraft,
  type ReportPublisher,
} from '../../models/reports/publication.js'
import { cities } from '../../models/reports/report.js'
import type { PhotoFile } from '../effects.js'
import type { NoticePresenter } from '../app/notice.presenter.js'
import { Store } from '../store.js'
import { categoryLabels } from './report-card.js'

export interface PublishState {
  draft: ReportDraft
  photos: PublishPhoto[]
  pending: boolean
  errors: Partial<Record<DraftField, string>>
  message: string
}

export interface PublishPhoto {
  file: PublishPhotoFile
  previewUrl: string
  mediaId?: string
}

export type PublishPhotoFile = ReportPhotoFile

interface Dependencies {
  publisher: Pick<ReportPublisher, 'publish'>
  media: ReportMediaClient
  effects: { createPreview(file: PhotoFile): string; revokePreview(url: string): void }
  filters: { reset(): void }
  notices: Pick<NoticePresenter, 'show'>
  onPublished: () => void
}

const emptyDraft: ReportDraft = {
  type: 'lost',
  category: 'pet',
  title: '',
  description: '',
  city: 'La Paz',
  zone: '',
  incidentDate: '',
  phone: '',
  petSpecies: '',
}

const issueMessages: Record<DraftField, Partial<Record<DraftIssue, string>>> = {
  type: { invalid: 'Elige si el reporte es por una pérdida o un hallazgo.' },
  category: { invalid: 'Elige una categoría válida.' },
  title: {
    required: 'Escribe un nombre para el reporte.',
    too_long: 'Usa como máximo 200 caracteres.',
  },
  description: {
    required: 'Describe lo que perdiste o encontraste.',
    too_short: 'Usa al menos 20 caracteres para que puedan reconocerlo.',
    too_long: 'Usa como máximo 5000 caracteres.',
  },
  city: {
    required: 'Indica una ciudad.',
    too_long: 'Usa como máximo 100 caracteres.',
  },
  zone: {
    required: 'Indica la zona o el barrio.',
    too_long: 'Usa como máximo 200 caracteres.',
  },
  incidentDate: {
    required: 'Indica una fecha válida.',
    invalid: 'Indica una fecha válida.',
  },
  phone: {
    required: 'Ingresa un número de WhatsApp con código de país.',
    invalid: 'Revisa el número de WhatsApp y su código de país.',
  },
  petSpecies: {
    required: 'Indica la especie de la mascota.',
    too_long: 'Usa como máximo 100 caracteres.',
  },
  mediaIds: { invalid: 'Revisa las fotos adjuntas e intenta nuevamente.' },
}

export const publishOptions = {
  categories: Object.entries(categoryLabels).map(([value, label]) => ({ value, label })),
  cities: [...cities],
}

/** Coordinates the form, server request, feedback and catalog refresh. */
export class PublishPresenter extends Store<PublishState> {
  constructor(private readonly dependencies: Dependencies) {
    super({ draft: emptyDraft, photos: [], pending: false, errors: {}, message: '' })
  }

  setType = (type: ReportDraft['type']) => this.setField('type', type)

  setField = <Field extends keyof ReportDraft>(field: Field, value: ReportDraft[Field]) => {
    const errors: PublishState['errors'] = { ...this.state.errors }
    delete errors[field as DraftField]
    if (field === 'category' && value !== 'pet') delete errors.petSpecies
    this.setState({
      ...this.state,
      draft: { ...this.state.draft, [field]: value },
      errors,
      message: '',
    })
  }

  addPhotos = (files: Iterable<PublishPhotoFile>) => {
    const photos = [...this.state.photos]
    let rejectedForLimit = false
    let rejectedForType = false
    for (const file of files) {
      if (photos.length >= maxPhotoCount) {
        rejectedForLimit = true
        continue
      }
      if (!isAcceptedPhoto(file, photos.length)) {
        rejectedForType = true
        continue
      }
      photos.push({ file, previewUrl: this.dependencies.effects.createPreview(file) })
    }
    this.setState({
      ...this.state,
      photos,
      message: rejectedForLimit
        ? 'Puedes adjuntar hasta 3 fotos.'
        : rejectedForType
          ? 'Elige fotos JPG o PNG de hasta 5 MB.'
          : '',
    })
  }

  removePhoto = async (index: number) => {
    const photo = this.state.photos[index]
    if (!photo) return
    if (photo.mediaId) {
      try {
        await this.dependencies.media.remove(photo.mediaId)
      } catch {
        this.setState({ ...this.state, message: 'No se pudo quitar la foto. Intenta nuevamente.' })
        return
      }
    }
    this.dependencies.effects.revokePreview(photo.previewUrl)
    this.setState({
      ...this.state,
      photos: this.state.photos.filter((_, photoIndex) => photoIndex !== index),
      message: '',
    })
  }

  releasePhotos = () => {
    const photos = this.state.photos
    for (const photo of photos) {
      this.dependencies.effects.revokePreview(photo.previewUrl)
      if (photo.mediaId) void this.dependencies.media.remove(photo.mediaId).catch(() => {})
    }
    this.setState({ ...this.state, photos: [] })
  }

  /** Returns false on validation, network failure or while another request is pending. */
  submit = async () => {
    if (this.state.pending) return false
    const issues = validateDraft(this.state.draft)
    if (Object.keys(issues).length) {
      const errors: PublishState['errors'] = {}
      for (const [field, issue] of Object.entries(issues) as [DraftField, DraftIssue][])
        errors[field] = issueMessages[field][issue]
      this.setState({ ...this.state, errors, message: '' })
      return false
    }

    this.setState({ ...this.state, pending: true, errors: {}, message: '' })
    let uploadingMedia = false
    try {
      const { petSpecies, ...draft } = this.state.draft
      const mediaIds: string[] = []
      uploadingMedia = true
      for (let index = 0; index < this.state.photos.length; index++) {
        const photo = this.state.photos[index]!
        let mediaId = photo.mediaId
        if (!mediaId) {
          mediaId = await this.dependencies.media.upload(photo.file)
          const photos = this.state.photos.map((item, photoIndex) =>
            photoIndex === index ? { ...item, mediaId } : item,
          )
          this.setState({ ...this.state, photos })
        }
        mediaIds.push(mediaId)
      }
      uploadingMedia = false
      await this.dependencies.publisher.publish({
        ...(draft.category === 'pet' ? { ...draft, petSpecies } : draft),
        ...(mediaIds.length ? { mediaIds } : {}),
      })
      for (const photo of this.state.photos)
        this.dependencies.effects.revokePreview(photo.previewUrl)
      this.setState({ draft: emptyDraft, photos: [], pending: false, errors: {}, message: '' })
      this.dependencies.filters.reset()
      this.dependencies.onPublished()
      this.dependencies.notices.show('Tu reporte se publicó y ya aparece en el catálogo.')
      return true
    } catch (error) {
      const failure = error instanceof ReportPublishFailure ? error : undefined
      const errors: PublishState['errors'] = {}
      if (failure?.reason === 'validation') {
        for (const [field, issue] of Object.entries(failure.errors) as [DraftField, DraftIssue][])
          errors[field] = issueMessages[field][issue]
      }
      const message = uploadingMedia
        ? 'No se pudo subir una foto. Intenta nuevamente.'
        : failure?.reason === 'unauthorized'
          ? 'Inicia sesión nuevamente para publicar el reporte.'
          : failure?.reason === 'validation' && errors.mediaIds
            ? errors.mediaIds
            : failure?.reason === 'validation' && Object.keys(errors).length
              ? ''
              : 'No se pudo publicar el reporte. Intenta nuevamente.'
      this.setState({ ...this.state, pending: false, errors, message })
      return false
    }
  }

  reset = () => {
    this.releasePhotos()
    this.setState({ draft: emptyDraft, photos: [], pending: false, errors: {}, message: '' })
  }
}
