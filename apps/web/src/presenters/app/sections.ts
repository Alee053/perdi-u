export type Section =
  'overview' | 'explore' | 'map' | 'publish' | 'my-reports' | 'saved' | 'safety' | 'profile'

export const sectionLabels: Record<Section, string> = {
  overview: 'Resumen',
  explore: 'Explorar reportes',
  map: 'Mapa',
  publish: 'Publicar reporte',
  'my-reports': 'Mis reportes',
  saved: 'Guardados',
  safety: 'Seguridad y privacidad',
  profile: 'Mi perfil',
}

/** Account-owned sections; saved reports remain a per-device list. */
export const privateSections = new Set<Section>(['publish', 'my-reports', 'profile'])
