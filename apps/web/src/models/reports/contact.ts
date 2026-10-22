/** International number as the API returns it: country code and number, 8 to 15 digits only. */
export const isWhatsAppNumber = (phone: string) => /^[1-9]\d{7,14}$/.test(phone)

/**
 * WhatsApp chat link with a prepared message, or undefined when the number is not valid. Only
 * digits reach the path and the message travels encoded, so no value can change the destination.
 */
export function whatsAppUrl(phone: string, text: string): string | undefined {
  if (!isWhatsAppNumber(phone)) return undefined
  return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text)
}
