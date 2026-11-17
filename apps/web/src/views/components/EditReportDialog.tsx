import { useEffect, useRef } from 'react'
import type { AppView } from '../../presenters/app/useApp'

type EditForm = NonNullable<AppView['myReports']['edit']>
type EditField = keyof EditForm['draft']

export function EditReportDialog({
  edit,
  onChange,
  onSave,
  onCancel,
}: {
  edit: EditForm
  onChange: (field: EditField, value: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    dialog.current!.showModal()
    return () => dialog.current?.close()
  }, [])
  const error = (field: EditField) =>
    edit.errors[field] ? (
      <small id={`edit-${field}-error`} role="alert">
        {edit.errors[field]}
      </small>
    ) : null
  const input = (
    field: 'title' | 'city' | 'zone' | 'petSpecies',
    label: string,
    maxLength: number,
  ) => (
    <label key={field}>
      {label}
      <input
        value={edit.draft[field]}
        maxLength={maxLength}
        aria-invalid={Boolean(edit.errors[field])}
        aria-describedby={edit.errors[field] ? `edit-${field}-error` : undefined}
        onChange={(event) => onChange(field, event.target.value)}
      />
      {error(field)}
    </label>
  )
  const select = (field: 'type' | 'category', label: string, options: [string, string][]) => (
    <label key={field}>
      {label}
      <select value={edit.draft[field]} onChange={(event) => onChange(field, event.target.value)}>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      {error(field)}
    </label>
  )
  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby="edit-report-title"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      <h2 id="edit-report-title">Editar reporte</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
      >
        {select('type', 'Tipo de reporte', [
          ['lost', 'Perdido'],
          ['found', 'Encontrado'],
        ])}
        {input('title', 'Nombre del reporte', 200)}
        <label>
          Descripción
          <textarea
            value={edit.draft.description}
            minLength={20}
            maxLength={5000}
            aria-invalid={Boolean(edit.errors.description)}
            aria-describedby={edit.errors.description ? 'edit-description-error' : undefined}
            onChange={(event) => onChange('description', event.target.value)}
          />
          {error('description')}
        </label>
        {select('category', 'Categoría', [
          ['pet', 'Mascota'],
          ['object', 'Objeto'],
          ['document', 'Documento'],
        ])}
        {edit.draft.category === 'pet' && input('petSpecies', 'Especie de la mascota', 100)}
        <label>
          Fecha del hecho
          <input
            type="date"
            value={edit.draft.incidentDate}
            aria-invalid={Boolean(edit.errors.incidentDate)}
            aria-describedby={edit.errors.incidentDate ? 'edit-incidentDate-error' : undefined}
            onChange={(event) => onChange('incidentDate', event.target.value)}
          />
          {error('incidentDate')}
        </label>
        {input('city', 'Ciudad', 100)}
        {input('zone', 'Zona o barrio', 200)}
        {edit.message && <p role="alert">{edit.message}</p>}
        <div className="detail-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="primary-button" type="submit" disabled={edit.pending}>
            {edit.pending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
