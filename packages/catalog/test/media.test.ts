import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { ReportMediaError, ReportMediaService } from '../src/media.js'

test('subir una imagen guarda el objeto privado y devuelve solo su ID', async () => {
  const calls: unknown[][] = []
  const service = new ReportMediaService(
    {
      async create(...args) {
        calls.push(['metadata', ...args])
      },
      async beginDelete() {
        return undefined
      },
      async completeDelete() {},
      async findAttached() {
        return undefined
      },
    },
    {
      async put(...args) {
        calls.push(['put', ...args])
      },
      async get() {
        return undefined
      },
      async delete(key) {
        calls.push(['delete', key])
      },
    },
  )

  const result = await service.upload(
    'verified-owner',
    '11111111-1111-4111-8111-111111111111',
    'image/png',
    Uint8Array.from([137, 80, 78, 71]),
  )

  assert.equal(result, '11111111-1111-4111-8111-111111111111')
  assert.deepEqual(calls, [
    [
      'put',
      'report-media/11111111-1111-4111-8111-111111111111',
      'image/png',
      Uint8Array.from([137, 80, 78, 71]),
    ],
    [
      'metadata',
      'verified-owner',
      '11111111-1111-4111-8111-111111111111',
      'report-media/11111111-1111-4111-8111-111111111111',
      'image/png',
      4,
    ],
  ])
})

test('leer fotos respeta la visibilidad del reporte y solo el propietario ve las resueltas', async () => {
  let state: 'active' | 'resolved' = 'active'
  let reads = 0
  const service = new ReportMediaService(
    {
      async create() {},
      async beginDelete() {
        return undefined
      },
      async completeDelete() {},
      async findAttached() {
        return {
          storageKey: 'private-key',
          contentType: 'image/png' as const,
          ownerId: 'owner',
          state,
        }
      },
    },
    {
      async put() {},
      async get() {
        reads++
        return Uint8Array.from([137, 80, 78, 71])
      },
      async delete() {},
    },
  )
  const id = '11111111-1111-4111-8111-111111111111'
  await service.read(id)
  state = 'resolved'
  for (const viewer of [undefined, 'other'])
    await assert.rejects(
      service.read(id, viewer),
      (error: unknown) => error instanceof ReportMediaError && error.reason === 'not_found',
    )
  assert.equal(reads, 1, 'una lectura no autorizada no llega al bucket')
  await service.read(id, 'owner')
  assert.equal(reads, 2)
})
