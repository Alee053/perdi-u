import { useEffect, useRef } from 'react'
import type { AppView } from '../../presenters/app/useApp'

type EditForm = NonNullable<AppView['myReports']['edit']>

export function EditReportDialog({
  edit,
  onChange,
  onSave,
  onCancel,
}: {
  edit: EditForm
  onChange: (field: 'title', value: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    dialog.current!.showModal()
    return () => dialog.current?.close()
  }, [])
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
        <label>
          Nombre del reporte
          <input
            value={edit.draft.title}
            maxLength={200}
            aria-invalid={Boolean(edit.errors.title)}
            aria-describedby={edit.errors.title ? 'edit-title-error' : undefined}
            onChange={(event) => onChange('title', event.target.value)}
          />
          {edit.errors.title && (
            <small id="edit-title-error" role="alert">
              {edit.errors.title}
            </small>
          )}
        </label>
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
