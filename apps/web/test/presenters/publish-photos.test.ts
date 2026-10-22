import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import type { ReportDraft, ReportPhotoFile } from '../../src/models/reports/publication.js'
import { PublishPresenter } from '../../src/presenters/reports/publish.presenter.js'

const photo = (name: string): ReportPhotoFile => ({
  name,
  type: 'image/jpeg',
  size: 1024,
  async arrayBuffer() {
    return new ArrayBuffer(1)
  },
})

for (const cancel of ['releasePhotos', 'reset'] as const) {
  test(`salir mediante ${cancel} durante una subida no publica ni altera un formulario nuevo`, async () => {
    let finishUpload!: (id: string) => void
    const waiting = new Promise<string>((resolve) => {
      finishUpload = resolve
    })
    const submissions: ReportDraft[] = []
    const removed: string[] = []
    let uploads = 0
    const presenter = new PublishPresenter({
      publisher: {
        publish: async (draft) => {
          submissions.push(draft)
        },
      },
      media: {
        upload: async () => {
          uploads++
          return waiting
        },
        remove: async (id) => {
          removed.push(id)
        },
      },
      effects: {
        createPreview: (file) => 'blob:' + (file as ReportPhotoFile).name,
        revokePreview() {},
      },
      filters: { reset() {} },
      notices: { show() {} },
      onPublished() {},
    })
    presenter.setField('category', 'object')
    presenter.setField('title', 'Mochila de prueba')
    presenter.setField('description', 'Mochila de prueba encontrada cerca de la plaza.')
    presenter.setField('zone', 'Centro')
    presenter.setField('incidentDate', '2026-10-21')
    presenter.setField('phone', '+591 70000000')
    presenter.addPhotos([photo('1.jpg'), photo('2.jpg')])
    const pending = presenter.submit()
    presenter[cancel]()
    presenter.setField('title', 'Otro formulario')
    finishUpload('completed-after-leaving')
    assert.equal(await pending, false)
    assert.deepEqual(submissions, [])
    assert.equal(uploads, 1)
    assert.deepEqual(removed, ['completed-after-leaving'])
    assert.equal(presenter.getSnapshot().draft.title, 'Otro formulario')
    assert.equal(presenter.getSnapshot().pending, false)
  })
}

test('quitar dos fotos subidas concurrentemente no conserva IDs borrados', async () => {
  const completions: (() => void)[] = []
  const presenter = new PublishPresenter({
    publisher: {
      publish: async () => {
        throw new Error('temporary failure')
      },
    },
    media: {
      upload: async (file) => file.name,
      remove: async () =>
        new Promise<void>((resolve) => {
          completions.push(resolve)
        }),
    },
    effects: {
      createPreview: (file) => 'blob:' + (file as ReportPhotoFile).name,
      revokePreview() {},
    },
    filters: { reset() {} },
    notices: { show() {} },
    onPublished() {},
  })
  presenter.setField('category', 'object')
  presenter.setField('title', 'Mochila de prueba')
  presenter.setField('description', 'Mochila de prueba encontrada cerca de la plaza.')
  presenter.setField('zone', 'Centro')
  presenter.setField('incidentDate', '2026-10-21')
  presenter.setField('phone', '+591 70000000')
  presenter.addPhotos([photo('one.jpg'), photo('two.jpg')])
  assert.equal(await presenter.submit(), false)
  const first = presenter.removePhoto(0)
  const second = presenter.removePhoto(1)
  completions[0]!()
  await first
  completions[1]!()
  await second
  assert.deepEqual(presenter.getSnapshot().photos, [])
})

// Regression: the publish form must accept photos (S1-06) and send them with the report.
test('el formulario de publicación permite adjuntar hasta tres fotos y las envía con el reporte', async () => {
  const uploads: string[] = []
  const submissions: ReportDraft[] = []
  const presenter = new PublishPresenter({
    publisher: { publish: async (draft) => void submissions.push({ ...draft }) },
    media: {
      upload: async (file) => {
        uploads.push(file.name)
        return 'media-' + file.name
      },
      remove: async () => {},
    },
    effects: {
      createPreview: (file) => 'blob:' + (file as ReportPhotoFile).name,
      revokePreview: () => {},
    },
    filters: { reset: () => {} },
    notices: { show: () => {} },
    onPublished: () => {},
  })
  presenter.setField('category', 'object')
  presenter.setField('title', 'Billetera café')
  presenter.setField('description', 'Billetera café de cuero encontrada en la plaza principal.')
  presenter.setField('zone', 'Centro')
  presenter.setField('incidentDate', '2026-10-21')
  presenter.setField('phone', '+591 70123456')

  presenter.addPhotos([photo('1.jpg'), photo('2.jpg'), photo('3.jpg'), photo('4.jpg')])
  const state = presenter.getSnapshot()
  assert.deepEqual(
    state.photos.map(({ previewUrl }) => previewUrl),
    ['blob:1.jpg', 'blob:2.jpg', 'blob:3.jpg'],
  )
  assert.equal(state.message, 'Puedes adjuntar hasta 3 fotos.')

  assert.equal(await presenter.submit(), true)
  assert.deepEqual(uploads, ['1.jpg', '2.jpg', '3.jpg'])
  assert.deepEqual(submissions[0]?.mediaIds, ['media-1.jpg', 'media-2.jpg', 'media-3.jpg'])
})
