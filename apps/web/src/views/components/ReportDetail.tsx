import { LoaderCircle, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { ReportLinkView } from '../../presenters/reports/report-detail.presenter'
import { ReportPhoto } from './ReportPhoto'

type ReportDetailProps = {
  view: ReportLinkView
  onSave: () => void
  onContact: () => void
  onResolve: () => void
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
  onResolve,
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
          {...{ onSave, onContact, onResolve, onSelectPhoto, onNextPhoto, onPreviousPhoto }}
        />
      )}
    </dialog>
  )
}

function ReadyDetail({
  view,
  onSave,
  onContact,
  onResolve,
  onSelectPhoto,
  onNextPhoto,
  onPreviousPhoto,
}: {
  view: Extract<ReportLinkView, { status: 'ready' }>
  onSave: () => void
  onContact: () => void
  onResolve: () => void
  onSelectPhoto: (index: number) => void
  onNextPhoto: () => void
  onPreviousPhoto: () => void
}) {
  const { card: report, gallery, saved, canContact, canResolve } = view.detail
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
            <dd>{report.person}</dd>
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
          <button className="secondary-button" onClick={onSave} aria-pressed={saved}>
            {saved ? 'Guardado' : 'Guardar'}
          </button>
        </div>
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
