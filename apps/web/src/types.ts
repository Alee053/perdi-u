export type Category = 'Mascota' | 'Objeto' | 'Documentos'
export type ReportStatus = 'Perdido' | 'Encontrado'
export type FilterStatus = 'Todos' | ReportStatus
export type Section =
  'overview' | 'explore' | 'map' | 'publish' | 'my-reports' | 'saved' | 'safety' | 'profile'

export type ReportDisplay = {
  id: string
  title: string
  description: string
  category: Category
  status: ReportStatus
  city: string
  zone: string
  date: string
  posted: string
  image: string
  person: string
  initials: string
  color: string
  resolved?: boolean
}

export type DemoReport = ReportDisplay & {
  source: 'demo'
  phone: string
  position: { top: string; left: string }
}
export type CatalogReport = ReportDisplay & { source: 'catalog' }
export type Report = DemoReport | CatalogReport

export type ReportView = 'grid' | 'map'
