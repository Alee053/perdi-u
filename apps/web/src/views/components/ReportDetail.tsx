import { LoaderCircle, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { ReportLinkView } from '../../presenters/reports/report-detail.presenter'
import { ReportAuthor } from './ReportAuthor'
import { ReportPhoto } from './ReportPhoto'

type ReportDetailProps = {
  view: ReportLinkView
  onSave: () => void
  onContact: () => void
  onCopyLink?: () => void
  onResolve: () => void
  onEdit: () => void
  onRetry?: () => void
  onClose: () => void
  onSelectPhoto: (index: number) => void
  onNextPhoto: () => void
  onPreviousPhoto: () => void
}

export function ReportDetail({
  view,
  onSave,
  onContact,
  onCopyLink,
  onResolve,
  onEdit,
  onRetry,
  onClose,
  onSelectPhoto,
  onNextPhoto,
  onPreviousPhoto,
}: ReportDetailProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current!
    const opener = element.ownerDocument.activeElement
    element.showModal()
    return () => {
      element.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className="modal"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose()
      }}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      aria-labelledby={view.status === 'ready' ? 'detail-title' : undefined}
      aria-label={view.status === 'ready' ? undefined : 'Detalle del reporte'}
      aria-busy={view.status === 'loading'}
    >
      <button className="modal-close" onClick={onClose} aria-label="Cerrar">
        <X size={18} />
      </button>
      {view.status === 'loading' && (
        <p className="detail-state" role="status">
          <LoaderCircle size={16} className="spin" /> Cargando reporte…
        </p>
      )}
      {view.status === 'unavailable' && (
        <div className="detail-state">
          <h2>{view.message}</h2>
          <p>Puede que se haya cerrado o que el enlace no sea correcto.</p>
        </div>
      )}
      {view.status === 'error' && (
        <div className="detail-state" role="alert">
          <p>{view.message}</p>
          {view.canRetry && onRetry && (
            <button className="secondary-button" onClick={onRetry}>
              Reintentar
            </button>
          )}
        </div>
      )}
      {view.status === 'ready' && (
        <ReadyDetail
          view={view}
          onCopyLink={onCopyLink}
          {...{ onSave, onContact, onResolve, onEdit, onSelectPhoto, onNextPhoto, onPreviousPhoto }}
        />
      )}
    </dialog>
  )
}

function ReadyDetail({
  view,
  onSave,
  onContact,
  onCopyLink,
  onResolve,
  onEdit,
  onSelectPhoto,
  onNextPhoto,
  onPreviousPhoto,
}: {
  view: Extract<ReportLinkView, { status: 'ready' }>
  onSave: () => void
  onContact: () => void
  onCopyLink?: () => void
  onResolve: () => void
  onEdit: () => void
  onSelectPhoto: (index: number) => void
  onNextPhoto: () => void
  onPreviousPhoto: () => void
}) {
  const { card: report, gallery, saved, canContact, canResolve, canEdit } = view.detail
  return (
    <>
      <figure className="detail-gallery" aria-label="Fotos del reporte">
        <ReportPhoto
          key={gallery.source}
          className="detail-image"
          src={gallery.source}
          privatePhoto={report.resolved}
          alt={gallery.alt}
        />
        <figcaption className="gallery-caption" aria-live="polite">
          {gallery.caption}
        </figcaption>
        {gallery.canNavigate && (
          <div className="gallery-controls" role="group" aria-label="Seleccionar foto">
            <button
              className="secondary-button"
              onClick={onPreviousPhoto}
              aria-label="Foto anterior"
            >
              Anterior
            </button>
            {gallery.choices.map((choice) => (
              <button
                key={choice.index}
                className="secondary-button"
                aria-label={choice.label}
                aria-pressed={choice.selected}
                onClick={() => onSelectPhoto(choice.index)}
              >
                {choice.index + 1}
              </button>
            ))}
            <button className="secondary-button" onClick={onNextPhoto} aria-label="Foto siguiente">
              Siguiente
            </button>
          </div>
        )}
      </figure>
      <div className="detail-content">
        <h2 id="detail-title">{report.title}</h2>
        <dl className="detail-facts">
          <div>
            <dt>Tipo</dt>
            <dd className={'status-text ' + report.tone}>{report.status}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{report.stateLabel}</dd>
          </div>
          <div>
            <dt>Categoría</dt>
            <dd>{report.category}</dd>
          </div>
          {report.petSpecies && (
            <div>
              <dt>Especie</dt>
              <dd>{report.petSpecies}</dd>
            </div>
          )}
          <div>
            <dt>Fecha del hecho</dt>
            <dd>{report.date}</dd>
          </div>
          <div>
            <dt>Fecha de publicación</dt>
            <dd>{report.posted}</dd>
          </div>
          <div>
            <dt>Publicado por</dt>
            <dd>
              <ReportAuthor name={report.person} photoUrl={report.authorPhotoUrl} />
            </dd>
          </div>
        </dl>
        <section aria-labelledby="detail-description-title">
          <h3 id="detail-description-title">Descripción</h3>
          <p className="detail-description">{report.description}</p>
        </section>
        <section aria-labelledby="detail-location-title">
          <h3 id="detail-location-title">Ubicación reportada</h3>
          <dl className="detail-facts">
            <div>
              <dt>Ciudad</dt>
              <dd>{report.city}</dd>
            </div>
            <div>
              <dt>Zona</dt>
              <dd>{report.zone}</dd>
            </div>
          </dl>
        </section>
        <div className="detail-actions">
          {canEdit && (
            <button className="secondary-button" onClick={onEdit}>
              Editar datos
            </button>
          )}
          {canResolve && (
            <button className="primary-button" onClick={onResolve}>
              Marcar como resuelto
            </button>
          )}
          {canContact && (
            <button className="primary-button" onClick={onContact} disabled={view.contacting}>
              {view.contacting && <LoaderCircle size={15} className="spin" />}
              Contactar por WhatsApp
            </button>
          )}
          {view.share && onCopyLink && (
            <button
              type="button"
              className="secondary-button"
              onClick={onCopyLink}
              aria-disabled={view.share.pending}
            >
              {view.share.pending && <LoaderCircle size={15} className="spin" aria-hidden="true" />}
              Copiar enlace
            </button>
          )}
          <button className="secondary-button" onClick={onSave} aria-pressed={saved}>
            {saved ? 'Guardado' : 'Guardar'}
          </button>
        </div>
        {view.share && (
          <p id="report-share-status" role="status">
            {view.share.message}
          </p>
        )}
        {view.share?.manualUrl && (
          <label className="form-field">
            Enlace del reporte
            <input
              type="text"
              readOnly
              value={view.share.manualUrl}
              aria-describedby="report-share-status"
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
        )}
        {view.contactMessage && (
          <p className="detail-notice" role="status">
            {view.contactMessage}
          </p>
        )}
        <small className="hint">Tu correo no se muestra. Coordina el contacto con cuidado.</small>
      </div>
    </>
  )
}
