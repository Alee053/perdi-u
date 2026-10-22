import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { detectImageContent } from '../src/media/content.js'

test('la inspección de contenido reconoce PNG y JPEG reales, no el MIME declarado', () => {
  assert.equal(detectImageContent(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])), 'image/png')
  assert.equal(detectImageContent(Uint8Array.from([255, 216, 255, 224, 0])), 'image/jpeg')
  assert.equal(detectImageContent(Uint8Array.from([0, 1, 2, 3])), undefined)
})
