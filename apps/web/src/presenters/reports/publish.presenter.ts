import {
  ReportPublishFailure,
  validateDraft,
  type DraftField,
  type DraftIssue,
  type ReportDraft,
  type ReportPublisher,
} from '../../models/reports/publication.js'
import { cities } from '../../models/reports/report.js'
import type { NoticePresenter } from '../app/notice.presenter.js'
import { Store } from '../store.js'
import { categoryLabels } from './report-card.js'

export interface PublishState {
  draft: ReportDraft
  pending: boolean
  errors: Partial<Record<DraftField, string>>
  message: string
}

interface Dependencies {
  publisher: Pick<ReportPublisher, 'publish'>
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
}

export const publishOptions = {
  categories: Object.entries(categoryLabels).map(([value, label]) => ({ value, label })),
  cities: [...cities],
}

/** Coordinates the form, server request, feedback and catalog refresh. */
export class PublishPresenter extends Store<PublishState> {
  constructor(private readonly dependencies: Dependencies) {
    super({ draft: emptyDraft, pending: false, errors: {}, message: '' })
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
    try {
      const { petSpecies, ...draft } = this.state.draft
      await this.dependencies.publisher.publish(
        draft.category === 'pet' ? { ...draft, petSpecies } : draft,
      )
      this.setState({ draft: emptyDraft, pending: false, errors: {}, message: '' })
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
      const message =
        failure?.reason === 'unauthorized'
          ? 'Inicia sesión nuevamente para publicar el reporte.'
          : failure?.reason === 'validation' && Object.keys(errors).length
            ? ''
            : 'No se pudo publicar el reporte. Intenta nuevamente.'
      this.setState({ ...this.state, pending: false, errors, message })
      return false
    }
  }

  reset = () => this.setState({ draft: emptyDraft, pending: false, errors: {}, message: '' })
}
