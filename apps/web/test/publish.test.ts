import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import type { CreateReportInput } from '@perdiu/contracts'
import { createReportPublisher } from '../src/infrastructure/http/publish-client.js'

const input: CreateReportInput = {
  type: 'found',
  category: 'object',
  title: 'Mochila azul',
  description: 'La encontré cerca del mercado central.',
  city: 'La Paz',
  zone: 'Sopocachi',
  incidentDate: '2026-10-20',
  phone: '+59170000000',
}

const published = {
  id: 'report-id',
  type: 'found',
  state: 'active',
  category: 'object',
  title: 'Mochila azul',
  description: 'La encontré cerca del mercado central.',
  city: 'La Paz',
  zone: 'Sopocachi',
  incidentDate: '2026-10-20',
  createdAt: '2026-10-20T12:00:00.000Z',
  author: { id: 'owner-id', displayName: 'Usuario' },
  imageUrls: [],
}

test('publica el formulario con el bearer y valida la respuesta pública', async () => {
  let request: { url: string; init?: RequestInit } | undefined
  const publisher = createReportPublisher(
    '/api',
    async () => 'access-token',
    async (url, init) => {
      request = { url: String(url), init }
      return new Response(JSON.stringify(published), { status: 201 })
    },
  )

  await publisher.publish(input)

  assert.deepEqual(request, {
    url: '/api/reports',
    init: {
      method: 'POST',
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  })
})

test('una respuesta 400 conserva los errores por campo del API', async () => {
  const publisher = createReportPublisher(
    '/api',
    async () => 'access-token',
    async () =>
      new Response(JSON.stringify({ fieldErrors: { phone: 'invalid' } }), { status: 400 }),
  )

  await assert.rejects(publisher.publish(input), (error: { errors?: unknown }) => {
    assert.deepEqual(error.errors, { phone: 'invalid' })
    return true
  })
})
