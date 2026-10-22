/** Stable link of a report: it works from the app, a shared message or a reload. */
export const reportPath = (id: string) => '/reportes/' + encodeURIComponent(id)

/** ID of a report link, or undefined for any other address. The API validates the ID itself. */
export function parseReportPath(path: string): string | undefined {
  const segment = /^\/reportes\/([^/]+)\/?$/.exec(path)?.[1]
  if (!segment) return undefined
  try {
    return decodeURIComponent(segment)
  } catch {
    return undefined
  }
}
