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
