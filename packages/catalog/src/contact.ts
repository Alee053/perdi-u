/**
 * WhatsApp number of a stored contact phone, or undefined when it is not a valid destination.
 * Only Bolivian mobiles (8 digits starting with 6 or 7, with or without +591) are accepted, so a
 * stored value can never turn into another country, a landline or a URL fragment.
 */
export function toWhatsAppNumber(phone: string): string | undefined {
  const digits = phone.trim().replace(/[\s().-]/g, '')
  const mobile = /^(?:\+?591)?([67]\d{7})$/.exec(digits)?.[1]
  return mobile && '591' + mobile
}
