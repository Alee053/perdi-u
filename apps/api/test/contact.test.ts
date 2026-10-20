import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { normalizeBolivianWhatsAppPhone } from '../src/reports/contact.js'

test('normaliza celulares bolivianos y rechaza valores incompletos o ajenos', () => {
  assert.equal(normalizeBolivianWhatsAppPhone('70123456'), '59170123456')
  assert.equal(normalizeBolivianWhatsAppPhone('+591 7 0123-456'), '59170123456')
  assert.equal(normalizeBolivianWhatsAppPhone('591 (6) 1234 567'), '59161234567')
  for (const phone of ['', '12345678', '5917000000', '+1 202 555 0100', '591770000001x']) {
    assert.equal(normalizeBolivianWhatsAppPhone(phone), undefined)
  }
})
