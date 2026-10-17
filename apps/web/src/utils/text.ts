export const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')

export const sectionLabels: Record<import('../types').Section, string> = {
  overview: 'Resumen',
  explore: 'Explorar reportes',
  map: 'Mapa',
  publish: 'Publicar reporte',
  'my-reports': 'Mis reportes',
  saved: 'Guardados',
  safety: 'Seguridad y privacidad',
}

export const statusColors: Record<import('../types').ReportStatus, string> = {
  Perdido: 'lost',
  Encontrado: 'found',
}
