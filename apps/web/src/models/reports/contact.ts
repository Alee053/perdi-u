/** Normalized Bolivian mobile as the API returns it: 591 followed by 8 digits starting with 6 or 7. */
export const isWhatsAppNumber = (phone: string) => /^591[67]\d{7}$/.test(phone)

/**
 * WhatsApp chat link with a prepared message, or undefined when the number is not valid. Only
 * digits reach the path and the message travels encoded, so no value can change the destination.
 */
export function whatsAppUrl(phone: string, text: string): string | undefined {
  if (!isWhatsAppNumber(phone)) return undefined
  return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text)
}
