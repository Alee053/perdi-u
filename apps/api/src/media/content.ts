export const MAX_MEDIA_BYTES = 5 * 1024 * 1024

/** Detects the supported image formats from their file signatures, not user supplied MIME data. */
export function detectImageContent(bytes: Uint8Array): 'image/jpeg' | 'image/png' | undefined {
  if (
    bytes.length >= 8 &&
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  )
    return 'image/png'
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return 'image/jpeg'
}
