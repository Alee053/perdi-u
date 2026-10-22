import { BadRequestException } from '@nestjs/common'
import type { OwnReportQuery, ReportQuery } from '@perdiu/contracts'

/** A private query never accepts an owner supplied by the client. */
export function parseOwnReportQuery(input: Record<string, unknown>): OwnReportQuery {
  if (
    Object.keys(input).some((key) => key !== 'state') ||
    (input.state !== undefined && input.state !== 'active' && input.state !== 'resolved')
  )
    throw new BadRequestException('Parámetros de mis reportes inválidos.')
  return input.state ? { state: input.state } : {}
}

/** HTTP input is untrusted; never echo values in validation errors. */
export function parseReportQuery(input: Record<string, unknown>): ReportQuery {
  const invalid = () => new BadRequestException('Parámetros de búsqueda inválidos.')
  const allowed = ['q', 'type', 'category', 'city']
  if (Object.keys(input).some((key) => !allowed.includes(key))) throw invalid()
  const values: Record<string, string> = {}
  for (const [key, value] of Object.entries(input)) {
    if (
      typeof value !== 'string' ||
      value.length > (key === 'q' ? 200 : 100) ||
      /[\u0000-\u001f\u007f]/.test(value)
    )
      throw invalid()
    if (value.trim()) values[key] = value.trim()
  }
  const type = values.type
  const category = values.category
  if (type !== undefined && type !== 'lost' && type !== 'found') throw invalid()
  if (
    category !== undefined &&
    category !== 'pet' &&
    category !== 'object' &&
    category !== 'document'
  )
    throw invalid()
  return {
    ...(values.q ? { q: values.q } : {}),
    ...(type ? { type } : {}),
    ...(category ? { category } : {}),
    ...(values.city ? { city: values.city } : {}),
  }
}

/** Report IDs are UUIDs; anything else is rejected before it reaches PostgreSQL. */
export function parseReportId(input: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input))
    throw new BadRequestException('Identificador de reporte inválido.')
  return input.toLowerCase()
}
