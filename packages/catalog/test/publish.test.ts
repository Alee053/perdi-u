import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { CreateReport, validateReportDraft } from '../src/index.js'

const draft = {
  type: 'lost',
  category: 'object',
  title: 'Mochila azul',
  description: 'La encontré cerca del mercado.',
  city: 'La Paz',
  zone: 'Sopocachi',
  incidentDate: '2026-10-20',
  phone: '+591 70000000',
}

test('una descripción menor a 20 caracteres impide publicar', () => {
  assert.deepEqual(validateReportDraft({ ...draft, description: 'Muy corta.' }), {
    description: 'too_short',
  })
})

test('un reporte válido supera la validación inicial', () => {
  assert.deepEqual(validateReportDraft(draft), {})
})

test('la validación informa varios campos inválidos en una sola respuesta', () => {
  assert.deepEqual(
    validateReportDraft({
      ...draft,
      type: 'other',
      category: 'pet',
      title: 'x'.repeat(201),
      description: 'Muy corta.',
      city: ' ',
      zone: 'x'.repeat(201),
      incidentDate: '2026-02-30',
      phone: '59170000000',
      petSpecies: ' ',
    }),
    {
      type: 'invalid',
      title: 'too_long',
      description: 'too_short',
      city: 'required',
      zone: 'too_long',
      incidentDate: 'invalid',
      phone: 'invalid',
      petSpecies: 'required',
    },
  )
})

test('publicar usa el dueño verificado y devuelve solo la proyección pública', async () => {
  let received: unknown
  const publisher = new CreateReport({
    async create(ownerId, input) {
      received = { ownerId, input }
      return {
        id: 'generated-id',
        ownerId,
        type: 'found',
        state: 'active',
        category: 'pet',
        title: input.title,
        description: input.description,
        city: input.city,
        zone: input.zone,
        incidentDate: input.incidentDate,
        createdAt: '2026-10-20T14:00:00.000Z',
        petSpecies: input.petSpecies,
        author: { id: ownerId, displayName: 'Usuario' },
        imageUrls: [],
      }
    },
  })

  const result = await publisher.execute('verified-owner', {
    ...draft,
    category: 'pet',
    title: '  Luna  ',
    city: ' La Paz ',
    zone: ' Sopocachi ',
    phone: '+591 70000000',
    petSpecies: ' Perro ',
    ownerId: 'attacker',
    state: 'resolved',
  })

  assert.deepEqual(received, {
    ownerId: 'verified-owner',
    input: {
      type: 'lost',
      category: 'pet',
      title: 'Luna',
      description: 'La encontré cerca del mercado.',
      city: 'La Paz',
      zone: 'Sopocachi',
      incidentDate: '2026-10-20',
      phone: '+59170000000',
      petSpecies: 'Perro',
    },
  })
  assert.deepEqual(result, {
    id: 'generated-id',
    type: 'found',
    state: 'active',
    category: 'pet',
    title: 'Luna',
    description: 'La encontré cerca del mercado.',
    city: 'La Paz',
    zone: 'Sopocachi',
    incidentDate: '2026-10-20',
    createdAt: '2026-10-20T14:00:00.000Z',
    petSpecies: 'Perro',
    author: { id: 'verified-owner', displayName: 'Usuario' },
    imageUrls: [],
  })
})
