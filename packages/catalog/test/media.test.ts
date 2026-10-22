import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { ReportMediaService } from '../src/media.js'

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
