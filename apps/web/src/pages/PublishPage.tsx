import { Heart, ImagePlus, LockKeyhole, Plus, Search, ShieldCheck, X } from 'lucide-react'
import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react'
import type { ReportStatus } from '../types'
import { PageHeading } from '../components/common/PageHeading'

type PublishPageProps = {
  postStatus: ReportStatus
  setPostStatus: Dispatch<SetStateAction<ReportStatus>>
  imagePreview: string
  setImagePreview: (image: string) => void
  choosePhoto: (event: ChangeEvent<HTMLInputElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function PublishPage({
  postStatus,
  setPostStatus,
  imagePreview,
  setImagePreview,
  choosePhoto,
  onSubmit,
}: PublishPageProps) {
  return (
    <>
      <PageHeading
        eyebrow="NUEVO REPORTE"
        title="Publicar reporte"
        description="Comparte lo esencial. La comunidad puede ayudarte a reunir lo que se perdió."
      />
      <div className="publish-layout">
        <form className="publish-form panel" onSubmit={onSubmit}>
          <div className="form-section-head">
            <span className="form-step">01</span>
            <div>
              <h2>¿Qué ocurrió?</h2>
              <p>Elige si perdiste algo o encontraste algo.</p>
            </div>
          </div>
          <div className="status-choice">
            <button
              type="button"
              className={postStatus === 'Perdido' ? 'selected lost-choice' : ''}
              onClick={() => setPostStatus('Perdido')}
            >
              <Search size={16} /> Perdí algo
            </button>
            <button
              type="button"
              className={postStatus === 'Encontrado' ? 'selected found-choice' : ''}
              onClick={() => setPostStatus('Encontrado')}
            >
              <Heart size={16} /> Encontré algo
            </button>
          </div>
          <div className="form-section-head form-section-next">
            <span className="form-step">02</span>
            <div>
              <h2>Cuéntanos los detalles</h2>
              <p>Incluye información que ayude a reconocerlo.</p>
            </div>
          </div>
          <label className={'upload-zone ' + (imagePreview ? 'has-image' : '')}>
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Vista previa de la foto" />
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault()
                    setImagePreview('')
                  }}
                  aria-label="Quitar foto"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <span className="upload-icon">
                  <ImagePlus size={20} />
                </span>
                <strong>Arrastra una foto o selecciónala</strong>
                <small>JPG o PNG · Hasta 5 MB</small>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={choosePhoto}
              aria-label="Subir fotografía"
            />
          </label>
          <div className="form-grid">
            <label className="form-field form-wide">
              <span>Nombre del reporte</span>
              <input
                name="title"
                placeholder="Ej. Perrito café, mochila azul..."
                required
                minLength={3}
              />
            </label>
            <label className="form-field form-wide">
              <span>Descripción</span>
              <textarea
                name="description"
                placeholder="Color, características, cuándo y dónde..."
                required
                minLength={20}
                rows={4}
              />
              <small>Evita incluir números de documento, cuentas u otros datos sensibles.</small>
            </label>
            <label className="form-field">
              <span>Categoría</span>
              <select name="category">
                <option>Mascota</option>
                <option>Objeto</option>
                <option>Documentos</option>
              </select>
            </label>
            <label className="form-field">
              <span>Ciudad</span>
              <select name="city">
                <option>La Paz</option>
                <option>Cochabamba</option>
                <option>Santa Cruz</option>
              </select>
            </label>
            <label className="form-field">
              <span>Zona o barrio</span>
              <input name="zone" placeholder="Ej. Sopocachi, Equipetrol..." required />
            </label>
            <label className="form-field">
              <span>Fecha aproximada</span>
              <input name="date" type="date" />
            </label>
          </div>
          <div className="form-footer">
            <span>
              <LockKeyhole size={13} /> Tu correo y número no aparecen públicamente.
            </span>
            <button className="primary-button" type="submit">
              <Plus size={16} /> Publicar reporte
            </button>
          </div>
        </form>
        <aside className="publish-aside">
          <div className="panel publish-preview-panel">
            <span className="preview-kicker">VISTA PREVIA</span>
            <h3>Así aparecerá tu reporte</h3>
            <p>Se mostrará a personas que buscan o encontraron algo parecido.</p>
            {imagePreview ? (
              <img className="preview-photo" src={imagePreview} alt="Vista previa" />
            ) : (
              <div className="preview-placeholder">
                <ImagePlus size={23} />
                <span>Tu foto aparecerá aquí</span>
              </div>
            )}
            <div className="preview-status">
              <span className={'status-pill ' + (postStatus === 'Perdido' ? 'lost' : 'found')}>
                <i /> {postStatus}
              </span>
              <span>Mascota · La Paz</span>
            </div>
            <b className="preview-title">Nombre de tu reporte</b>
            <p className="preview-copy">Agrega una descripción para ayudar a reconocerlo.</p>
          </div>
          <div className="privacy-note">
            <ShieldCheck size={18} />
            <div>
              <b>Tu privacidad importa</b>
              <p>
                No publiques información personal. Tu número se comparte solo cuando decides iniciar
                contacto.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
