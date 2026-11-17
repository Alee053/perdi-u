import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { createOwnReportsClient } from '../src/infrastructure/http/own-reports-client.js'
import { SessionRejected } from '../src/models/auth/session.js'
import { OwnReportsFailure } from '../src/models/reports/own-reports-repository.js'

const summary = {
  id: 'own-1',
  title: 'Mochila de prueba',
  description: 'Descripción ficticia para el test.',
  type: 'found',
  state: 'resolved',
  category: 'object',
  city: 'La Paz',
  zone: 'Centro',
  incidentDate: '2026-10-20',
  createdAt: '2026-10-20T12:00:00.123456Z',
  imageUrls: [],
  author: { id: 'owner-1', displayName: 'Mismo Nombre' },
}

test('el cliente privado lee activos y resueltos, proyecta datos y confirma el PATCH con bearer sin caché', async () => {
  const calls: { url: string; init?: RequestInit }[] = []
  const client = createOwnReportsClient(
    '/api/',
    async () => 'test-session',
    async (url, init) => {
      calls.push({ url: String(url), init })
      return init?.method === 'PATCH'
        ? new Response(null, { status: 204 })
        : Response.json([
            { ...summary, phone: 'private-contact', storageKey: 'private-key' },
            { ...summary, id: 'own-2', state: 'active' },
          ])
    },
  )
  const signal = new AbortController().signal
  const reports = await client.list(signal)
  // Fetch parses JSON outside Jest's VM; compare content in the test's realm.
  assert.deepEqual(JSON.parse(JSON.stringify(reports)), [
    summary,
    { ...summary, id: 'own-2', state: 'active' },
  ])
  await client.resolve('own-1', signal)
  assert.deepEqual(
    calls.map(({ url }) => url),
    ['/api/me/reports', '/api/reports/own-1/resolve'],
  )
  for (const { init } of calls) {
    assert.equal(init?.cache, 'no-store')
    assert.equal(init?.credentials, 'omit')
    assert.equal(init?.signal, signal)
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-session')
    assert.equal(init?.body, undefined)
  }
  assert.equal(calls[1]!.init?.method, 'PATCH')
})

test('el cliente distingue sesión rechazada y permisos, y rechaza DTOs o confirmaciones inválidas', async () => {
  const signal = new AbortController().signal
  const noToken = createOwnReportsClient(
    '/api',
    async () => undefined,
    async () => {
      throw new Error('No debe pedir datos sin token')
    },
  )
  await assert.rejects(noToken.list(signal), SessionRejected)
  for (const status of [401, 403, 404, 503]) {
    const client = createOwnReportsClient(
      '/api',
      async () => 'test-session',
      async () => new Response(null, { status }),
    )
    await assert.rejects(client.resolve('own-1', signal), (error: unknown) =>
      status === 401
        ? error instanceof SessionRejected
        : error instanceof OwnReportsFailure &&
          error.reason ===
            (status === 403 ? 'forbidden' : status === 404 ? 'not_found' : 'unavailable'),
    )
  }
  for (const data of [
    {},
    [{ ...summary, state: 'archived' }],
    [{ ...summary, imageUrls: ['javascript:alert(1)'] }],
  ]) {
    const client = createOwnReportsClient(
      '/api',
      async () => 'test-session',
      async () => Response.json(data),
    )
    await assert.rejects(client.list(signal))
  }
  const unconfirmed = createOwnReportsClient(
    '/api',
    async () => 'test-session',
    async () => Response.json({}),
  )
  await assert.rejects(unconfirmed.resolve('own-1', signal), OwnReportsFailure)
})

test('el cliente envía un PATCH autenticado y devuelve el reporte actualizado', async () => {
  const calls: { url: string; init?: RequestInit }[] = []
  const updated = { ...summary, state: 'active', title: 'Mochila recuperada' }
  const client = createOwnReportsClient(
    '/api/',
    async () => 'test-session',
    async (url, init) => {
      calls.push({ url: String(url), init })
      return Response.json(updated)
    },
  )
  const signal = new AbortController().signal
  assert.deepEqual(
    JSON.parse(JSON.stringify(await client.edit('own-1', { title: updated.title }, signal))),
    updated,
  )
  assert.equal(calls[0]?.url, '/api/reports/own-1')
  assert.equal(calls[0]?.init?.method, 'PATCH')
  assert.equal(calls[0]?.init?.body, JSON.stringify({ title: updated.title }))
  assert.equal(calls[0]?.init?.signal, signal)
  assert.equal(calls[0]?.init?.cache, 'no-store')
  assert.equal(calls[0]?.init?.credentials, 'omit')
  assert.equal(new Headers(calls[0]?.init?.headers).get('authorization'), 'Bearer test-session')
})

test('el cliente conserva los errores de validación devueltos por PATCH', async () => {
  const client = createOwnReportsClient(
    '/api',
    async () => 'test-session',
    async () => Response.json({ fieldErrors: { title: 'too_long' } }, { status: 400 }),
  )
  await assert.rejects(
    client.edit('own-1', { title: 'x'.repeat(201) }, new AbortController().signal),
    (error: unknown) =>
      error instanceof OwnReportsFailure &&
      error.reason === 'validation' &&
      error.fieldErrors.title === 'too_long',
  )
})

test('el cliente identifica el conflicto cuando el reporte ya fue resuelto', async () => {
  const client = createOwnReportsClient(
    '/api',
    async () => 'test-session',
    async () => new Response(null, { status: 409 }),
  )
  await assert.rejects(
    client.edit('own-1', { title: 'Cambio tardío' }, new AbortController().signal),
    (error: unknown) => error instanceof OwnReportsFailure && error.reason === 'conflict',
  )
})
