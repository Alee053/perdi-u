import { ArrowRight, CheckCircle2, LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react'
import { PageHeading } from '../components/common/PageHeading'

export function SafetyPage() {
  return (
    <>
      <PageHeading
        eyebrow="CUIDAMOS LA COMUNIDAD"
        title="Seguridad y privacidad"
        description="Ayudar y reencontrarse puede ser sencillo, siempre que cuides tus datos y elijas cómo coordinar."
      />
      <div className="safety-dashboard-grid">
        <div className="safety-hero-card">
          <div className="safety-graphic">
            <div className="safety-ring ring-one" />
            <div className="safety-ring ring-two" />
            <span>
              <ShieldCheck size={40} />
            </span>
            <i>✓</i>
          </div>
          <div>
            <span className="panel-eyebrow">TU TRANQUILIDAD PRIMERO</span>
            <h2>
              Ayudar sí.
              <br />
              <em>Exponerte, no.</em>
            </h2>
            <p>
              Tu correo no aparece públicamente. Tú decides si inicias una conversación y cuándo
              compartir tus datos.
            </p>
          </div>
        </div>
        <div className="panel safety-checklist">
          <div className="panel-heading">
            <div>
              <span className="panel-eyebrow">ANTES DE ENCONTRARSE</span>
              <h2>Una coordinación segura</h2>
            </div>
            <ShieldCheck size={19} />
          </div>
          <SafetyTip
            number="01"
            title="Elige un lugar público"
            copy="Coordina la devolución en una plaza concurrida, cafetería o punto de encuentro conocido."
          />
          <SafetyTip
            number="02"
            title="Ve acompañado si puedes"
            copy="Cuéntale a alguien de confianza dónde será el encuentro y con quién."
          />
          <SafetyTip
            number="03"
            title="Comparte solo lo necesario"
            copy="Evita publicar tu dirección, números de documento o información financiera."
          />
          <SafetyTip
            number="04"
            title="Confirma los detalles"
            copy="Antes de entregar un objeto, pide a la otra persona que describa algo que no publicaste."
          />
        </div>
        <div className="privacy-card">
          <span>
            <LockKeyhole size={18} />
          </span>
          <div>
            <b>Tu privacidad en PerdiU</b>
            <p>
              El correo de tu cuenta nunca se muestra en el catálogo. El contacto se inicia de forma
              directa cuando eliges escribir.
            </p>
          </div>
          <CheckCircle2 size={18} />
        </div>
        <div className="safety-contact-card">
          <span className="contact-help-icon">
            <MessageCircle size={19} />
          </span>
          <div>
            <b>¿Algo no se siente bien?</b>
            <p>Puedes dejar de responder y buscar ayuda de alguien de confianza.</p>
          </div>
          <a href="mailto:hola@perdiu.bo">
            Contactar a PerdiU <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </>
  )
}

function SafetyTip({ number, title, copy }: { number: string; title: string; copy: string }) {
  return (
    <div className="safety-tip">
      <span>{number}</span>
      <div>
        <b>{title}</b>
        <p>{copy}</p>
      </div>
      <CheckCircle2 size={17} />
    </div>
  )
}
