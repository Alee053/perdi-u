import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { GetReportContact, toWhatsAppNumber } from '../src/index.js'
import type { ReportRecord } from '../src/index.js'

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

const report = (overrides: Partial<ReportRecord> = {}): ReportRecord => ({
  id: 'report-1',
  ownerId: 'owner-1',
  type: 'found',
  state: 'active',
  category: 'document',
  title: 'Carnet encontrado',
  description: 'Carnet de identidad encontrado en la parada del teleférico.',
  city: 'La Paz',
  zone: 'Obrajes',
  incidentDate: '2026-10-12',
  createdAt: '2026-10-12T10:00:00.000000Z',
  author: { id: 'owner-1', displayName: 'Autor de prueba' },
  imageUrls: [],
  ...overrides,
})

function contacts(record: ReportRecord | undefined, phone: string | undefined) {
  const phonesRead: string[] = []
  const contact = new GetReportContact({
    find: async (id) => (id === record?.id ? record : undefined),
    findContactPhone: async (id) => {
      phonesRead.push(id)
      return phone
    },
  })
  return { contact, phonesRead }
}

test('el contacto de un reporte accesible se entrega normalizado a una sesión verificada', async () => {
  const { contact } = contacts(report(), '+591 700-00001')
  assert.deepEqual(await contact.execute('report-1', 'viewer-1'), {
    available: true,
    whatsapp: '59170000001',
  })
})

test('sin teléfono o con uno inválido el contacto figura como no disponible', async () => {
  for (const phone of [undefined, '', '22123456', 'https://evil.example'])
    assert.deepEqual(
      await contacts(report(), phone).contact.execute('report-1', 'viewer-1'),
      { available: false },
      String(phone),
    )
})

test('el teléfono no se consulta si el reporte no existe o es un resuelto ajeno', async () => {
  const missing = contacts(undefined, '70000001')
  assert.equal(await missing.contact.execute('report-1', 'viewer-1'), undefined)
  const closed = contacts(report({ state: 'resolved' }), '70000001')
  assert.equal(await closed.contact.execute('report-1', 'viewer-1'), undefined)
  assert.deepEqual([...missing.phonesRead, ...closed.phonesRead], [])
  assert.deepEqual(await closed.contact.execute('report-1', 'owner-1'), {
    available: true,
    whatsapp: '59170000001',
  })
})
