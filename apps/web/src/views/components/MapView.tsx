import { MapPin, PawPrint } from 'lucide-react'
import type { MapPin as MapPinView } from '../../presenters/reports/reports.presenter'

type MapViewProps = {
  pins: MapPinView[]
  onOpen: (id: string) => void
}

/** Illustrative map: the positions are demo data, not real coordinates. */
export function MapView({ pins, onOpen }: MapViewProps) {
  return (
    <div className="map-canvas" role="region" aria-label="Mapa ilustrativo de reportes">
      <svg viewBox="0 0 1000 570" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-40 116 C 180 60, 270 160, 410 132 S 650 50, 1050 118" />
        <path d="M-30 250 C 170 205, 330 340, 500 265 S 800 200, 1030 300" />
        <path d="M-10 430 C 180 390, 260 470, 450 418 S 700 360, 1010 445" />
        <path d="M150 -30 C 130 140, 250 230, 200 610" />
        <path d="M430 -20 C 380 140, 480 280, 410 610" />
        <path d="M720 -50 C 650 150, 780 310, 720 600" />
      </svg>
      {pins.map((pin) => (
        <button
          key={pin.id}
          className={'map-pin ' + pin.tone}
          style={{ top: pin.top, left: pin.left }}
          onClick={() => onOpen(pin.id)}
          aria-label={pin.label}
        >
          {pin.pet ? <PawPrint size={14} /> : <MapPin size={14} />}
          <span>{pin.number}</span>
        </button>
      ))}
      <span className="map-caption">Mapa ilustrativo · datos de demostración</span>
    </div>
  )
}
