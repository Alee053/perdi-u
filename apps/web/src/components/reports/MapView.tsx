import { ChevronRight, LocateFixed, MapPin, PawPrint } from 'lucide-react'
import type { DemoReport, Report } from '../../types'

type MapViewProps = {
  reports: Report[]
  onOpen: (report: Report) => void
}

export function MapView({ reports, onOpen }: MapViewProps) {
  return (
    <div className="map-canvas" role="region" aria-label="Mapa ilustrativo de reportes en Bolivia">
      <div className="map-wash map-wash-one" />
      <div className="map-wash map-wash-two" />
      <svg
        className="map-streets"
        viewBox="0 0 1000 570"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M-40 116 C 180 60, 270 160, 410 132 S 650 50, 1050 118" />
        <path d="M-30 250 C 170 205, 330 340, 500 265 S 800 200, 1030 300" />
        <path d="M-10 430 C 180 390, 260 470, 450 418 S 700 360, 1010 445" />
        <path d="M150 -30 C 130 140, 250 230, 200 610" />
        <path d="M430 -20 C 380 140, 480 280, 410 610" />
        <path d="M720 -50 C 650 150, 780 310, 720 600" />
        <path d="M890 -20 C 780 170, 900 370, 840 630" />
      </svg>
      <span className="map-label map-label-one">SOPOCACHI</span>
      <span className="map-label map-label-two">MIRAFLORES</span>
      <span className="map-label map-label-three">SAN JORGE</span>
      <span className="map-label map-label-four">CENTRO</span>
      <span className="map-park">PLAZA ABAROA</span>
      <span className="map-scale">1 km</span>
      <button className="map-locate" aria-label="Centrar el mapa">
        <LocateFixed size={17} />
      </button>
      {reports
        .filter((report): report is DemoReport => report.source === 'demo')
        .slice(0, 8)
        .map((report, index) => (
          <button
            className={'map-pin ' + (report.status === 'Perdido' ? 'pin-lost' : 'pin-found')}
            key={report.id}
            style={{ top: report.position.top, left: report.position.left }}
            onClick={() => onOpen(report)}
            aria-label={'Ver ' + report.title}
          >
            <span>
              {report.category === 'Mascota' ? <PawPrint size={15} /> : <MapPin size={15} />}
            </span>
            <i>{index + 1}</i>
          </button>
        ))}
      <div className="map-caption">
        <span className="live-dot" /> MAPA DE REPORTES · BOLIVIA
      </div>
    </div>
  )
}

export function MapResult({ report, onOpen }: { report: Report; onOpen: () => void }) {
  return (
    <button className="map-result" onClick={onOpen}>
      <img src={report.image} alt="" />
      <span>
        <small>
          {report.status} · {report.category}
        </small>
        <b>{report.title}</b>
        <em>
          <MapPin size={12} /> {report.zone}, {report.city}
        </em>
      </span>
      <ChevronRight size={15} />
    </button>
  )
}
