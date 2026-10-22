import type { FormEvent } from 'react'
import {
  publishOptions,
  type PublishPresenter,
  type PublishState,
} from '../../presenters/reports/publish.presenter'
import { PageHeading } from '../components/PageHeading'

type PublishPageProps = {
  form: PublishState
  actions: Pick<PublishPresenter, 'setType' | 'setField' | 'choosePhoto' | 'clearPhoto' | 'submit'>
}

export function PublishPage({ form, actions }: PublishPageProps) {
  const { draft, errors, imagePreview } = form
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    actions.submit()
  }
  const error = (field: keyof PublishState['errors']) =>
    errors[field] && <small id={field + '-error'}>{errors[field]}</small>

  return (
    <>
      <PageHeading
        title="Publicar reporte"
        description="Comparte lo esencial para que la comunidad pueda reconocerlo."
      />
      <p className="hint">
        Este formulario es una demostración. El reporte se conserva durante esta sesión y no aparece
        en Mis reportes.
      </p>
      <form className="panel publish-form" onSubmit={submit} noValidate>
        <fieldset className="type-choice">
          <legend>¿Qué ocurrió?</legend>
          <button
            type="button"
            aria-pressed={draft.type === 'lost'}
            className={draft.type === 'lost' ? 'selected lost' : ''}
            onClick={() => actions.setType('lost')}
          >
            Perdí algo
          </button>
          <button
            type="button"
            aria-pressed={draft.type === 'found'}
            className={draft.type === 'found' ? 'selected found' : ''}
            onClick={() => actions.setType('found')}
          >
            Encontré algo
          </button>
        </fieldset>

        <div className="photo-field">
          {imagePreview ? (
            <>
              <img src={imagePreview} alt="Vista previa de la foto" />
              <button type="button" className="secondary-button" onClick={actions.clearPhoto}>
                Quitar foto
              </button>
            </>
          ) : (
            <label className="upload-zone">
              <strong>Selecciona una foto</strong>
              <small>JPG o PNG · Hasta 5 MB</small>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) actions.choosePhoto(file)
                }}
                aria-label="Subir fotografía"
              />
            </label>
          )}
        </div>

        <div className="form-grid">
          <label className="form-field form-wide">
            <span>Nombre del reporte</span>
            <input
              value={draft.title}
              onChange={(event) => actions.setField('title', event.target.value)}
              placeholder="Ej. Perrito café, mochila azul…"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'title-error' : undefined}
            />
            {error('title')}
          </label>
          <label className="form-field form-wide">
            <span>Descripción</span>
            <textarea
              value={draft.description}
              onChange={(event) => actions.setField('description', event.target.value)}
              placeholder="Color, características, cuándo y dónde…"
              rows={4}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? 'description-error' : 'description-hint'}
            />
            {error('description') || (
              <small id="description-hint" className="hint">
                Evita incluir números de documento, cuentas u otros datos sensibles.
              </small>
            )}
          </label>
          <label className="form-field">
            <span>Categoría</span>
            <select
              value={draft.category}
              onChange={(event) =>
                actions.setField('category', event.target.value as typeof draft.category)
              }
            >
              {publishOptions.categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Ciudad</span>
            <select
              value={draft.city}
              onChange={(event) => actions.setField('city', event.target.value)}
            >
              {publishOptions.cities.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Zona o barrio</span>
            <input
              value={draft.zone}
              onChange={(event) => actions.setField('zone', event.target.value)}
              placeholder="Ej. Sopocachi, Equipetrol…"
              aria-invalid={Boolean(errors.zone)}
              aria-describedby={errors.zone ? 'zone-error' : undefined}
            />
            {error('zone')}
          </label>
          <label className="form-field">
            <span>Fecha aproximada</span>
            <input
              type="date"
              value={draft.incidentDate}
              onChange={(event) => actions.setField('incidentDate', event.target.value)}
            />
          </label>
        </div>

        <div className="form-footer">
          <small className="hint">Tu correo y tu número no aparecen públicamente.</small>
          <button className="primary-button" type="submit">
            Publicar reporte
          </button>
        </div>
      </form>
    </>
  )
}
