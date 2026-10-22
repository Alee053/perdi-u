import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { whatsAppUrl } from '../../src/models/reports/contact.js'

test('el enlace de WhatsApp abre el chat del número con el mensaje codificado', () => {
  const text =
    'Hola, vi tu reporte "Cámara ¿Sony?" en PerdiU: https://perdiu.test/reportes/1?a=b&c=d #3'
  const url = whatsAppUrl('59170000001', text)
  assert.equal(
    url,
    'https://wa.me/59170000001?text=Hola%2C%20vi%20tu%20reporte%20%22C%C3%A1mara%20%C2%BFSony%3F%22%20en%20PerdiU%3A%20https%3A%2F%2Fperdiu.test%2Freportes%2F1%3Fa%3Db%26c%3Dd%20%233',
  )
  const parsed = new URL(url!)
  assert.equal(parsed.origin, 'https://wa.me')
  assert.equal(parsed.pathname, '/59170000001')
  assert.deepEqual([...parsed.searchParams.keys()], ['text'])
  assert.equal(parsed.searchParams.get('text'), text)
})

test('un número internacional normalizado por la API también abre su chat', () => {
  assert.equal(whatsAppUrl('5491112345678', 'Hola'), 'https://wa.me/5491112345678?text=Hola')
  assert.equal(whatsAppUrl('14155552671', 'Hola'), 'https://wa.me/14155552671?text=Hola')
})

test('un valor que no son solo los dígitos de un número internacional no produce destino', () => {
  for (const phone of [
    '',
    '+59170000001',
    '059170000001',
    '1234567',
    '1234567890123456',
    '59170000001 ',
    '59170000001/evil',
    '59170000001?text=otro',
    'evil.example/59170000001',
    '//evil.example',
  ])
    assert.equal(whatsAppUrl(phone, 'Hola'), undefined, phone)
})
