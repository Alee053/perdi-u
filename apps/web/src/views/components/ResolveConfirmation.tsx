import { useEffect, useRef } from 'react'
import type { AppView } from '../../presenters/app/useApp'

export function ResolveConfirmation({
  confirmation,
  onConfirm,
  onCancel,
}: {
  confirmation: NonNullable<AppView['myReports']['confirmation']>
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="resolve-dialog"
      role="alertdialog"
      aria-labelledby="resolve-title"
      aria-describedby="resolve-description"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      <h2 id="resolve-title">¿Marcar como resuelto?</h2>
      <p>
        <strong>{confirmation.title}</strong>
      </p>
      <p id="resolve-description">
        El reporte dejará de aparecer en el catálogo y las búsquedas. Podrás seguir consultándolo en
        Mis reportes.
      </p>
      {confirmation.error && <p role="alert">{confirmation.error}</p>}
      <div className="detail-actions">
        <button
          className="secondary-button"
          autoFocus
          disabled={confirmation.pending}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button className="primary-button" disabled={confirmation.pending} onClick={onConfirm}>
          {confirmation.pending ? 'Cerrando caso…' : 'Confirmar cierre'}
        </button>
      </div>
    </dialog>
  )
}
