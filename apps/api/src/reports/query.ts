import { BadRequestException } from '@nestjs/common'
import type { ReportQuery } from '@perdiu/contracts'

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
