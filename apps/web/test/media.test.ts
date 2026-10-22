import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { createReportMediaClient } from '../src/infrastructure/http/media-client.js'

test('el cliente sube multipart autenticado y borra solo por su ID opaco', async () => {
  const requests: { url: string; init?: RequestInit }[] = []
  const client = createReportMediaClient(
    '/api/',
    async () => 'access-token',
    async (url, init) => {
      requests.push({ url: String(url), init })
      return init?.method === 'POST'
        ? new Response(JSON.stringify({ id: 'opaque-media-id' }), { status: 201 })
        : new Response(null, { status: 204 })
    },
  )
  await client.upload({
    name: 'foto.png',
    type: 'image/png',
    size: 4,
    async arrayBuffer() {
      return Uint8Array.from([137, 80, 78, 71]).buffer
    },
  })
  await client.remove('opaque-media-id')

  assert.equal(requests[0]?.url, '/api/media')
  assert.equal(requests[0]?.init?.credentials, 'omit')
  assert.deepEqual(requests[0]?.init?.headers, {
    Accept: 'application/json',
    Authorization: 'Bearer access-token',
  })
  assert.ok(requests[0]?.init?.body instanceof FormData)
  const file = (requests[0]?.init?.body as FormData).get('file') as File
  assert.equal(file.name, 'foto.png')
  assert.equal(file.type, 'image/png')
  assert.deepEqual(requests[1], {
    url: '/api/media/opaque-media-id',
    init: {
      method: 'DELETE',
      credentials: 'omit',
      headers: { Authorization: 'Bearer access-token' },
    },
  })
})
