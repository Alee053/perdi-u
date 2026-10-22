import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { createReportPhotoLoader } from '../src/infrastructure/http/report-photo-loader.js'

test('las fotos privadas se leen con bearer y sus recursos se liberan sin enviar tokens a otros destinos', async () => {
  const calls: { url: string; init?: RequestInit }[] = []
  const released: string[] = []
  const loader = createReportPhotoLoader(
    '/api',
    async () => 'verified-session',
    async (url, init) => {
      calls.push({ url: String(url), init })
      return new Response(Uint8Array.from([137, 80, 78, 71]), {
        headers: { 'Content-Type': 'image/png' },
      })
    },
    { createObjectURL: () => 'blob:private-photo', revokeObjectURL: (url) => released.push(url) },
  )
  const signal = new AbortController().signal
  const resource = await loader.load('/api/media/11111111-1111-4111-8111-111111111111', signal)
  assert.equal(resource.source, 'blob:private-photo')
  assert.equal(new Headers(calls[0]?.init?.headers).get('authorization'), 'Bearer verified-session')
  assert.equal(calls[0]?.init?.signal, signal)
  assert.equal(calls[0]?.init?.redirect, 'error')
  resource.release()
  assert.deepEqual(released, ['blob:private-photo'])
  for (const url of [
    'https://other.example/image.png',
    '/images/object.svg',
    '//other.example/image.png',
    '/api/media/../me',
  ])
    assert.equal((await loader.load(url, signal)).source, url)
  assert.equal(calls.length, 1)
})

test('una foto privada rechazada no crea una URL de imagen', async () => {
  const signal = new AbortController().signal
  for (const status of [401, 404, 503]) {
    const loader = createReportPhotoLoader(
      '/api',
      async () => 'session',
      async () => new Response(null, { status }),
    )
    await assert.rejects(loader.load('/api/media/11111111-1111-4111-8111-111111111111', signal))
  }
})
