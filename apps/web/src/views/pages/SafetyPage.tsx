import { PageHeading } from '../components/PageHeading'

const tips = [
  {
    title: 'Elige un lugar público',
    copy: 'Coordina la devolución en una plaza concurrida, cafetería o punto de encuentro conocido.',
  },
  {
    title: 'Ve acompañado si puedes',
    copy: 'Cuéntale a alguien de confianza dónde será el encuentro y con quién.',
  },
  {
    title: 'Comparte solo lo necesario',
    copy: 'Evita publicar tu dirección, números de documento o información financiera.',
  },
  {
    title: 'Confirma los detalles',
    copy: 'Antes de entregar un objeto, pide a la otra persona que describa algo que no publicaste.',
  },
]

export function SafetyPage() {
  return (
    <>
      <PageHeading
        title="Seguridad y privacidad"
        description="Recomendaciones para coordinar una devolución cuidando tus datos."
      />
      <section className="panel">
        <h2>Antes de encontrarse</h2>
        <ol className="tip-list">
          {tips.map((tip) => (
            <li key={tip.title}>
              <b>{tip.title}</b>
              <p>{tip.copy}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="panel">
        <h2>Tu privacidad en PerdiU</h2>
        <p>
          El correo de tu cuenta nunca se muestra en el catálogo. Tú decides si inicias una
          conversación y cuándo compartir tus datos. Si algo no se siente bien, puedes dejar de
          responder y buscar ayuda de alguien de confianza.
        </p>
        <a className="text-button" href="mailto:hola@perdiu.bo">
          Contactar a PerdiU
        </a>
      </section>
    </>
  )
}
