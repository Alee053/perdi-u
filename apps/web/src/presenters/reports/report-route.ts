/** Stable link of a report: it works from the app, a shared message or a reload. */
export const reportPath = (id: string) => '/reportes/' + encodeURIComponent(id)
