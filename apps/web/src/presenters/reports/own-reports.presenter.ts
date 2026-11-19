import type {
  EditReportInput,
  ReportCategory,
  ReportType,
  ReportValidationIssue,
} from '@perdiu/contracts'
import type { OwnReport } from '../../models/reports/report.js'
import {
  OwnReportsFailure,
  type OwnReportsRepository,
} from '../../models/reports/own-reports-repository.js'
import { selectOwnReports } from '../../models/reports/own-reports.js'
import { SessionRejected } from '../../models/auth/session.js'
import type { AuthPresenter } from '../auth/auth.presenter.js'
import type { NoticePresenter } from '../app/notice.presenter.js'
import { Store } from '../store.js'
import { toReportCard } from './report-card.js'

export type OwnFilter = 'Todos' | 'Activos' | 'Resueltos'
interface EditDraft {
  type: ReportType
  category: ReportCategory
  title: string
  description: string
  city: string
  zone: string
  incidentDate: string
  petSpecies: string
}
interface EditForm {
  id: string
  original: EditDraft
  draft: EditDraft
  pending: boolean
  errors: Partial<Record<keyof EditDraft, string>>
  message: string
}
interface OwnReportsState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  reports: OwnReport[]
  filter: OwnFilter
  message: string | null
  confirmation: string | null
  pending: boolean
  resolveError: string | null
  edit: EditForm | null
}
interface Dependencies {
  notices: Pick<NoticePresenter, 'show'>
  onResolved: (report: OwnReport) => void
  onEdited: (report: OwnReport) => void
  onSessionRejected: () => void
  onOwnerChanged: () => void
}

const initialState = (): OwnReportsState => ({
  status: 'idle',
  reports: [],
  filter: 'Todos',
  message: null,
  confirmation: null,
  pending: false,
  resolveError: null,
  edit: null,
})

const editIssueMessages: Record<keyof EditDraft, Partial<Record<ReportValidationIssue, string>>> = {
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
  city: { required: 'Indica una ciudad.', too_long: 'Usa como máximo 100 caracteres.' },
  zone: { required: 'Indica la zona o el barrio.', too_long: 'Usa como máximo 200 caracteres.' },
  incidentDate: { required: 'Indica una fecha válida.', invalid: 'Indica una fecha válida.' },
  petSpecies: {
    required: 'Indica la especie de la mascota.',
    too_long: 'Usa como máximo 100 caracteres.',
  },
}

function presentEditErrors(issues: OwnReportsFailure['fieldErrors']): EditForm['errors'] {
  const errors: EditForm['errors'] = {}
  for (const [field, issue] of Object.entries(issues) as [
    keyof EditDraft,
    ReportValidationIssue,
  ][]) {
    const message = editIssueMessages[field][issue]
    if (message) errors[field] = message
  }
  return errors
}

function createEditPatch(original: EditDraft, draft: EditDraft): EditReportInput {
  const petSpeciesChanged =
    draft.category === 'pet' &&
    (original.category !== 'pet' || draft.petSpecies !== original.petSpecies)
  return {
    ...(draft.type !== original.type && { type: draft.type }),
    ...((draft.category !== original.category || petSpeciesChanged) && {
      category: draft.category,
    }),
    ...(draft.title !== original.title && { title: draft.title }),
    ...(draft.description !== original.description && { description: draft.description }),
    ...(draft.city !== original.city && { city: draft.city }),
    ...(draft.zone !== original.zone && { zone: draft.zone }),
    ...(draft.incidentDate !== original.incidentDate && { incidentDate: draft.incidentDate }),
    ...(petSpeciesChanged && { petSpecies: draft.petSpecies }),
  }
}

export class OwnReportsPresenter extends Store<OwnReportsState> {
  private ownerId: string | null = null
  private ownerVersion = 0
  private request = 0
  private controller?: AbortController
  private mutation?: AbortController
  private editMutation?: AbortController
  constructor(
    private readonly repository: OwnReportsRepository,
    private readonly dependencies: Dependencies,
  ) {
    super(initialState())
  }
  private update(patch: Partial<OwnReportsState>) {
    this.setState({ ...this.state, ...patch })
  }

  start = (auth: Pick<AuthPresenter, 'getSnapshot' | 'subscribe'>) => {
    const follow = () => {
      const session = auth.getSnapshot()
      void this.setOwner(session.status === 'authenticated' ? session.user.id : null)
    }
    const unsubscribe = auth.subscribe(follow)
    follow()
    return () => {
      unsubscribe()
      void this.setOwner(null)
    }
  }

  setOwner = async (ownerId: string | null) => {
    if (this.ownerId === ownerId) return
    this.ownerVersion++
    this.cancelLoad()
    this.mutation?.abort()
    this.editMutation?.abort()
    this.ownerId = ownerId
    this.setState(initialState())
    this.dependencies.onOwnerChanged()
    if (ownerId) await this.load()
  }
  private cancelLoad() {
    this.request++
    this.controller?.abort()
  }
  private rejectSession() {
    void this.setOwner(null)
    this.dependencies.onSessionRejected()
  }
  load = async () => {
    const ownerId = this.ownerId
    if (!ownerId) return
    this.cancelLoad()
    const request = this.request
    this.controller = new AbortController()
    this.update({ status: 'loading', message: null })
    try {
      const reports = await this.repository.list(this.controller.signal)
      if (request !== this.request) return
      this.update({
        status: 'ready',
        reports: selectOwnReports(reports, ownerId).map((report) => ({ ...report, source: 'own' })),
      })
    } catch (error) {
      if (request !== this.request) return
      if (error instanceof SessionRejected) return this.rejectSession()
      this.update({
        status: 'error',
        message: 'No se pudo cargar tus reportes. Intenta nuevamente.',
      })
    }
  }
  setFilter = (filter: OwnFilter) => this.update({ filter })
  requestEdit = (id: string) => {
    if (!this.ownerId) return this.dependencies.onSessionRejected()
    const report = this.find(id)
    if (!report || report.state !== 'active' || this.state.pending || this.state.edit?.pending)
      return
    const draft: EditDraft = {
      type: report.type,
      category: report.category,
      title: report.title,
      description: report.description,
      city: report.city,
      zone: report.zone,
      incidentDate: report.incidentDate,
      petSpecies: report.petSpecies ?? '',
    }
    this.update({
      edit: {
        id,
        original: draft,
        draft,
        pending: false,
        errors: {},
        message: '',
      },
    })
  }
  setEditField = <Field extends keyof EditDraft>(field: Field, value: EditDraft[Field]) => {
    const edit = this.state.edit
    if (!edit || edit.pending) return
    const draft = { ...edit.draft, [field]: value }
    if (field === 'category' && value !== 'pet') draft.petSpecies = ''
    const errors = { ...edit.errors }
    delete errors[field]
    if (field === 'category' && value !== 'pet') delete errors.petSpecies
    this.update({ edit: { ...edit, draft, errors, message: '' } })
  }
  cancelEdit = () => {
    if (this.state.edit && !this.state.edit.pending) this.update({ edit: null })
  }
  submitEdit = async () => {
    const edit = this.state.edit
    if (!edit || edit.pending || !this.find(edit.id)) return false
    const patch = createEditPatch(edit.original, edit.draft)
    if (Object.keys(patch).length === 0) {
      this.update({ edit: null })
      return true
    }
    const version = this.ownerVersion
    const controller = new AbortController()
    this.editMutation = controller
    this.update({ edit: { ...edit, pending: true, errors: {}, message: '' } })
    let saved
    try {
      saved = await this.repository.edit(edit.id, patch, controller.signal)
    } catch (error) {
      if (version !== this.ownerVersion) return false
      if (error instanceof SessionRejected) {
        this.rejectSession()
        return false
      }
      const errors =
        error instanceof OwnReportsFailure && error.reason === 'validation'
          ? presentEditErrors(error.fieldErrors)
          : {}
      const message =
        error instanceof OwnReportsFailure && error.reason === 'forbidden'
          ? 'Solo puedes editar tus propios reportes.'
          : error instanceof OwnReportsFailure && error.reason === 'not_found'
            ? 'El reporte ya no está disponible.'
            : error instanceof OwnReportsFailure && error.reason === 'conflict'
              ? 'Este reporte ya fue resuelto y no se puede editar.'
              : Object.keys(errors).length
                ? ''
                : 'No se pudo guardar el reporte. Intenta nuevamente.'
      this.update({ edit: { ...edit, pending: false, errors, message } })
      return false
    }
    if (version !== this.ownerVersion) return false
    const updated: OwnReport = { ...saved, source: 'own' }
    this.update({
      reports: this.state.reports.map((report) => (report.id === updated.id ? updated : report)),
      edit: null,
    })
    this.dependencies.onEdited(updated)
    this.dependencies.notices.show('Cambios guardados.')
    return true
  }
  requestResolve = (id: string) => {
    if (!this.ownerId) return this.dependencies.onSessionRejected()
    if (this.state.pending || this.find(id)?.state !== 'active') return
    this.update({ confirmation: id, resolveError: null })
  }
  cancelResolve = () => {
    if (!this.state.pending) this.update({ confirmation: null, resolveError: null })
  }
  confirmResolve = async () => {
    const id = this.state.confirmation
    const report = id && this.find(id)
    if (!report || report.state !== 'active' || this.state.pending) return
    const version = this.ownerVersion
    this.mutation = new AbortController()
    this.update({ pending: true, resolveError: null })
    try {
      await this.repository.resolve(report.id, this.mutation.signal)
    } catch (error) {
      if (version !== this.ownerVersion) return
      if (error instanceof SessionRejected) return this.rejectSession()
      const message =
        error instanceof OwnReportsFailure && error.reason === 'forbidden'
          ? 'Solo puedes resolver tus propios reportes.'
          : error instanceof OwnReportsFailure && error.reason === 'not_found'
            ? 'El reporte ya no está disponible.'
            : 'No se pudo resolver el reporte. Intenta nuevamente.'
      this.update({ pending: false, resolveError: message })
      return
    }
    if (version !== this.ownerVersion) return
    this.cancelLoad()
    const resolved: OwnReport = { ...report, state: 'resolved' }
    this.update({
      status: 'ready',
      reports: this.state.reports.map((item) => (item.id === resolved.id ? resolved : item)),
      confirmation: null,
      pending: false,
      resolveError: null,
    })
    this.dependencies.onResolved(resolved)
    this.dependencies.notices.show(
      'Marcaste el reporte como resuelto; ya no aparecerá en las búsquedas.',
    )
  }
  find = (id: string) => this.state.reports.find((report) => report.id === id)

  view = () => {
    const { filter, status, message, confirmation, pending, resolveError, edit } = this.state
    const own = selectOwnReports(this.state.reports, this.ownerId)
    const state = filter === 'Todos' ? undefined : filter === 'Activos' ? 'active' : 'resolved'
    return {
      status,
      message,
      filter,
      total: own.length,
      active: selectOwnReports(own, this.ownerId, 'active').length,
      cards: selectOwnReports(own, this.ownerId, state).map((report) =>
        toReportCard({ ...report, source: 'own' }),
      ),
      empty: {
        title:
          own.length === 0
            ? 'Aún no publicaste reportes'
            : filter === 'Resueltos'
              ? 'Todavía no tienes reportes resueltos'
              : 'No tienes reportes activos',
      },
      confirmation: confirmation
        ? {
            id: confirmation,
            title: this.find(confirmation)?.title ?? '',
            pending,
            error: resolveError,
          }
        : null,
      edit: edit
        ? {
            id: edit.id,
            title: edit.original.title,
            draft: edit.draft,
            errors: edit.errors,
            pending: edit.pending,
            message: edit.message,
            hasChanges: Object.keys(createEditPatch(edit.original, edit.draft)).length > 0,
          }
        : null,
    }
  }
}
