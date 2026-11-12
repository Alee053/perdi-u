/** Removes spaces, dots, dashes and parentheses, as people usually type a phone number. */
export function normalizeReportPhone(phone: string) {
  return phone.trim().replace(/[\s().-]/g, '')
}

/**
 * WhatsApp number of a stored contact phone, or undefined when it is not a valid destination.
 * Publishing (S1-05) stores international numbers (`+` and 8 to 15 digits, any country); older
 * local values are accepted only as Bolivian mobiles (8 digits starting with 6 or 7, with or
 * without 591). Only digits are returned, so a stored value can never turn into a URL fragment.
 */
export function toWhatsAppNumber(phone: string): string | undefined {
  const normalized = normalizeReportPhone(phone)
  const international = /^\+([1-9]\d{7,14})$/.exec(normalized)?.[1]
  if (international) return international
  const mobile = /^(?:591)?([67]\d{7})$/.exec(normalized)?.[1]
  return mobile && '591' + mobile
}
