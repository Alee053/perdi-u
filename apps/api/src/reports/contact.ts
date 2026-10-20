/** Accept only Bolivian mobile numbers; incomplete or foreign input must never reach wa.me. */
export function normalizeBolivianWhatsAppPhone(value: string): string | undefined {
  const compact = value.trim().replace(/[()\s-]/g, '')
  const local = /^([67]\d{7})$/.exec(compact)?.[1]
  const international = /^\+?591([67]\d{7})$/.exec(compact)?.[1]
  const subscriber = local ?? international
  return subscriber ? `591${subscriber}` : undefined
}
