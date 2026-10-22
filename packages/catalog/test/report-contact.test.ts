import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { toWhatsAppNumber } from '../src/index.js'

test('un celular boliviano se normaliza al número internacional de WhatsApp', () => {
  for (const phone of [
    '59170000001',
    '+591 70000001',
    '+591 700-00001',
    '(591) 7000 0001',
    '70000001',
    ' 700.000.01 ',
  ])
    assert.equal(toWhatsAppNumber(phone), '59170000001', phone)
  assert.equal(toWhatsAppNumber('61234567'), '59161234567')
})

test('un teléfono ausente, fijo, extranjero o con otros caracteres no es un destino válido', () => {
  for (const phone of [
    '',
    '   ',
    '22123456',
    '5912212345',
    '7000000',
    '700000011',
    '5917000000123',
    '+54 9 11 1234 5678',
    '7000000a',
    '70000001?text=hola',
    '70000001/../evil',
    'https://evil.example/70000001',
    '５９１７００００００１',
  ])
    assert.equal(toWhatsAppNumber(phone), undefined, phone)
})
