import type { FormEvent } from 'react'
import { usePublishPage } from '../../presenters/reports/usePublishPage.js'
import {
  publishOptions,
  type PublishPresenter,
  type PublishState,
} from '../../presenters/reports/publish.presenter'
import { PageHeading } from '../components/PageHeading'

export function PublishPage({ presenter }: { presenter: PublishPresenter }) {
  const { form, actions } = usePublishPage(presenter)
  const { draft, errors } = form
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void actions.submit()
  }
  const error = (field: keyof PublishState['errors']) =>
    errors[field] && <small id={field + '-error'}>{errors[field]}</small>

  return (
    <>
      <PageHeading
        title="Publicar reporte"
        description="Comparte lo esencial para que la comunidad pueda reconocerlo."
      />
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

        <div className="form-grid">
          <label className="form-field form-wide">
            <span>Nombre del reporte</span>
            <input
              value={draft.title}
              onChange={(event) => actions.setField('title', event.target.value)}
              placeholder="Ej. Perrito café, mochila azul…"
              maxLength={200}
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
              maxLength={5000}
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
          {draft.category === 'pet' && (
            <label className="form-field">
              <span>Especie</span>
              <input
                value={draft.petSpecies ?? ''}
                onChange={(event) => actions.setField('petSpecies', event.target.value)}
                placeholder="Ej. Perro, gato…"
                maxLength={100}
                aria-invalid={Boolean(errors.petSpecies)}
                aria-describedby={errors.petSpecies ? 'petSpecies-error' : undefined}
              />
              {error('petSpecies')}
            </label>
          )}
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
              maxLength={200}
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
              aria-invalid={Boolean(errors.incidentDate)}
              aria-describedby={errors.incidentDate ? 'incidentDate-error' : undefined}
            />
            {error('incidentDate')}
          </label>
          <label className="form-field">
            <span>Número de WhatsApp</span>
            <input
              type="tel"
              value={draft.phone}
              onChange={(event) => actions.setField('phone', event.target.value)}
              placeholder="+591 70000000"
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'phone-error' : 'phone-hint'}
            />
            {error('phone') || (
              <small id="phone-hint" className="hint">
                Incluye el código de país; el número no se muestra en el catálogo.
              </small>
            )}
          </label>
        </div>

        <section className="photo-field" aria-label="Fotos del reporte">
          <label className="upload-zone">
            <span>Añade hasta 3 fotos JPG o PNG (máximo 5 MB cada una)</span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              disabled={form.pending}
              onChange={(event) => {
                actions.addPhotos(Array.from(event.target.files ?? []))
                event.target.value = ''
              }}
            />
          </label>
          {form.photos.length > 0 && (
            <div className="photo-previews">
              {form.photos.map((photo, index) => (
                <figure className="photo-preview" key={photo.previewUrl}>
                  <img src={photo.previewUrl} alt={`Vista previa de ${photo.file.name}`} />
                  <button
                    type="button"
                    className="text-button"
                    disabled={form.pending}
                    onClick={() => void actions.removePhoto(index)}
                  >
                    Quitar foto
                  </button>
                </figure>
              ))}
            </div>
          )}
        </section>

        {form.message && (
          <p className="message message-error" role="alert">
            {form.message}
          </p>
        )}
        <div className="form-footer">
          <small className="hint">
            No publiques números de documentos, cuentas bancarias ni contraseñas.
          </small>
          <button className="primary-button" type="submit" disabled={form.pending}>
            {form.pending ? 'Publicando…' : 'Publicar reporte'}
          </button>
        </div>
      </form>
    </>
  )
}
