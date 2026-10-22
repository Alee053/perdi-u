import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { ReportPhotoPresenter } from '../../src/presenters/reports/report-photo.presenter.js'
import type { ReportPhotoResource } from '../../src/models/reports/photo.js'

test('la foto privada libera recursos al cambiar o salir y descarta una respuesta anterior', async () => {
  let complete!: (value: ReportPhotoResource) => void
  let signal: AbortSignal | undefined
  const released: string[] = []
  const presenter = new ReportPhotoPresenter({
    load: async (_source, input) => {
      signal = input
      return new Promise<ReportPhotoResource>((resolve) => {
        complete = resolve
      })
    },
  })
  const first = presenter.show('/api/media/first', true)
  assert.equal(presenter.getSnapshot().source, undefined)
  await presenter.show('/images/object.svg', false)
  assert.equal(signal?.aborted, true)
  complete({ source: 'blob:late', release: () => released.push('late') })
  await first
  assert.equal(presenter.getSnapshot().source, '/images/object.svg')
  assert.deepEqual(released, ['late'])
  const current = presenter.show('/api/media/current', true)
  complete({ source: 'blob:current', release: () => released.push('current') })
  await current
  assert.equal(presenter.getSnapshot().source, 'blob:current')
  presenter.stop()
  assert.equal(presenter.getSnapshot().source, undefined)
  assert.deepEqual(released, ['late', 'current'])
})
