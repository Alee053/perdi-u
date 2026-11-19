import { LoaderCircle, X } from 'lucide-react'
import { useEffect, useRef, type ChangeEvent, type ReactNode } from 'react'
import type { AppView } from '../../presenters/app/useApp'
import { publishOptions } from '../../presenters/reports/publish.presenter'
import { typeLabels } from '../../presenters/reports/report-card'
import { CityInput } from './CityInput'

type EditForm = NonNullable<AppView['myReports']['edit']>
type EditField = keyof EditForm['draft']

export function EditReportDialog({
  edit,
  onChange,
  onSave,
  onCancel,
}: {
  edit: EditForm
  onChange: AppView['actions']['own']['setEditField']
  onSave: () => void
  onCancel: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { draft, errors, pending, message, hasChanges, title } = edit
  const hasFieldErrors = Object.keys(errors).length > 0

  useEffect(() => {
    const element = dialog.current!
    const opener = element.ownerDocument.activeElement
    element.showModal()
    return () => {
      element.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])
  useEffect(() => {
    if (hasFieldErrors) dialog.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [hasFieldErrors])

  const control = (field: EditField) => ({
    id: `edit-${field}`,
    value: draft[field],
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `edit-${field}-error` : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      onChange(field, event.target.value),
  })
  const formField = (field: EditField, label: string, input: ReactNode, wide = false) => (
    <div className={wide ? 'form-field form-wide' : 'form-field'}>
      <label htmlFor={`edit-${field}`}>{label}</label>
      {input}
      {errors[field] && (
        <small id={`edit-${field}-error`} role="alert">
          {errors[field]}
        </small>
      )}
    </div>
  )

  return (
    <dialog
      ref={dialog}
      className="modal edit-report-dialog"
      aria-labelledby="edit-report-title"
      aria-describedby="edit-report-name"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      <form
        className="edit-report-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
      >
        <header className="edit-report-header">
          <div>
            <h2 id="edit-report-title">Editar reporte</h2>
            <p id="edit-report-name">{title}</p>
          </div>
          <button
            className="secondary-button edit-report-close"
            type="button"
            aria-label="Cerrar edición"
            autoFocus
            disabled={pending}
            onClick={onCancel}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="edit-report-body">
          <fieldset className="edit-report-fields" disabled={pending}>
            <section className="edit-report-section" aria-labelledby="edit-report-data">
              <h3 id="edit-report-data">Datos del reporte</h3>
              <div className="form-grid">
                {formField(
                  'title',
                  'Nombre del reporte',
                  <input {...control('title')} maxLength={200} />,
                  true,
                )}
                {formField(
                  'type',
                  'Tipo de reporte',
                  <select {...control('type')}>
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>,
                )}
                {formField(
                  'category',
                  'Categoría',
                  <select {...control('category')}>
                    {publishOptions.categories.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>,
                )}
                {draft.category === 'pet' &&
                  formField(
                    'petSpecies',
                    'Especie de la mascota',
                    <input {...control('petSpecies')} maxLength={100} />,
                    true,
                  )}
                {formField(
                  'description',
                  'Descripción',
                  <textarea {...control('description')} rows={4} maxLength={5000} />,
                  true,
                )}
              </div>
            </section>
            <section className="edit-report-section" aria-labelledby="edit-report-location">
              <h3 id="edit-report-location">Ubicación y fecha</h3>
              <div className="form-grid edit-report-location">
                {formField(
                  'city',
                  'Ciudad',
                  <CityInput
                    {...control('city')}
                    suggestions={publishOptions.cities}
                    maxLength={100}
                  />,
                )}
                {formField('zone', 'Zona o barrio', <input {...control('zone')} maxLength={200} />)}
                {formField(
                  'incidentDate',
                  'Fecha del hecho',
                  <input {...control('incidentDate')} type="date" />,
                )}
              </div>
            </section>
          </fieldset>
        </div>
        <footer className="edit-report-footer">
          {message && (
            <p className="message message-error" role="alert">
              {message}
            </p>
          )}
          <div className="edit-report-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={pending}
              onClick={onCancel}
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              type="submit"
              aria-busy={pending}
              disabled={pending || !hasChanges}
            >
              {pending && <LoaderCircle size={16} className="spin" aria-hidden="true" />}
              {pending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  )
}
