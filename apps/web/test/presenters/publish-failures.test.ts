import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import {
  ReportPublishFailure,
  type ReportDraft,
  type ReportPhotoFile,
} from '../../src/models/reports/publication.js'
import { PublishPresenter } from '../../src/presenters/reports/publish.presenter.js'

// Characterization of how a failed publication is explained; these cases passed before refactoring.
const photo: ReportPhotoFile = {
  name: 'foto.jpg',
  type: 'image/jpeg',
  size: 10,
  async arrayBuffer() {
    return new ArrayBuffer(1)
  },
}

function failingSetup(failures: { upload?: Error; publish?: Error }) {
  const submissions: ReportDraft[] = []
  const presenter = new PublishPresenter({
    publisher: {
      publish: async (draft) => {
        submissions.push(draft)
        if (failures.publish) throw failures.publish
      },
    },
    media: {
      upload: async () => {
        if (failures.upload) throw failures.upload
        return 'media-id'
      },
      remove: async () => {},
    },
    effects: { createPreview: () => 'blob:preview', revokePreview: () => {} },
    filters: { reset: () => {} },
    notices: { show: () => {} },
    onPublished: () => {},
  })
  presenter.setField('category', 'object')
  presenter.setField('title', 'Mochila azul')
  presenter.setField('description', 'La encontré en un minibús de la línea 2.')
  presenter.setField('zone', 'Miraflores')
  presenter.setField('incidentDate', '2026-10-20')
  presenter.setField('phone', '+591 70123456')
  return { presenter, submissions }
}

test('si una foto no se sube, se explica sin publicar aunque la causa sea la sesión', async () => {
  for (const cause of [new Error('red'), new ReportPublishFailure('unauthorized')]) {
    const { presenter, submissions } = failingSetup({ upload: cause })
    presenter.addPhotos([photo])
    assert.equal(await presenter.submit(), false)
    assert.deepEqual(submissions, [], 'no se publica sin sus fotos')
    assert.equal(presenter.getSnapshot().message, 'No se pudo subir una foto. Intenta nuevamente.')
    assert.equal(presenter.getSnapshot().pending, false)
  }
})

test('si la sesión vence al publicar, se pide ingresar nuevamente', async () => {
  const { presenter } = failingSetup({ publish: new ReportPublishFailure('unauthorized') })
  assert.equal(await presenter.submit(), false)
  assert.equal(
    presenter.getSnapshot().message,
    'Inicia sesión nuevamente para publicar el reporte.',
  )
})

test('los errores de campo del API se muestran junto a cada campo sin mensaje general', async () => {
  const { presenter } = failingSetup({
    publish: new ReportPublishFailure('validation', { title: 'too_long', phone: 'invalid' }),
  })
  assert.equal(await presenter.submit(), false)
  assert.deepEqual(presenter.getSnapshot().errors, {
    title: 'Usa como máximo 200 caracteres.',
    phone: 'Revisa el número de WhatsApp y su código de país.',
  })
  assert.equal(presenter.getSnapshot().message, '')
})

for (const uploaded of [false, true]) {
  for (const cancel of ['reset', 'releasePhotos'] as const) {
    test(`${cancel} antes de publicar descarta el envío ${uploaded ? 'con fotos ya subidas' : 'sin fotos'}`, async () => {
      const failures: { publish?: Error } = {}
      const { presenter, submissions } = failingSetup(failures)
      if (uploaded) {
        presenter.addPhotos([photo])
        failures.publish = new Error('red')
        assert.equal(await presenter.submit(), false)
        failures.publish = undefined
      }
      const previousSubmissions = submissions.length

      const pending = presenter.submit()
      presenter[cancel]()
      presenter.setField('title', 'Otro formulario')
      const state = presenter.getSnapshot()

      assert.equal(await pending, false)
      assert.equal(submissions.length, previousSubmissions, 'no se publica el borrador abandonado')
      assert.deepEqual(presenter.getSnapshot(), state)
    })
  }
}
