import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { CreateReport } from '../src/publish.js'
import type { ReportCreation, ReportDraft } from '../src/publish.js'

const draft: ReportDraft = {
  title: 'Mochila azul',
  description: 'Mochila encontrada cerca de la plaza.',
  type: 'found',
  category: 'object',
  city: 'La Paz',
  zone: 'Centro',
  incidentDate: '2026-10-19',
}

test('la publicación asigna el reporte al sujeto autenticado', async () => {
  let submitted: ReportCreation | undefined
  const untrustedDraft = { ...draft, ownerId: 'attacker' } as ReportDraft
  const publish = new CreateReport({
    create: async (input) => {
      submitted = input
      return {
        ...input,
        id: 'report-1',
        state: 'active',
        createdAt: '2026-10-19T12:00:00.000Z',
      }
    },
  })

  await publish.execute('verified-subject', untrustedDraft)

  assert.equal(submitted?.ownerId, 'verified-subject')
})

test('la publicación crea inicialmente un reporte activo', async () => {
  let submitted: ReportCreation | undefined
  const publish = new CreateReport({
    create: async (input) => {
      submitted = input
      return {
        ...input,
        id: 'report-2',
        state: 'active',
        createdAt: '2026-10-19T12:00:00.000Z',
      }
    },
  })

  await publish.execute('verified-subject', draft)

  assert.ok(submitted)
  assert.equal(Reflect.get(submitted, 'state'), 'active')
})

test('la publicación rechaza una descripción menor de 20 caracteres antes de persistir', async () => {
  let writes = 0
  const publish = new CreateReport({
    create: async (input) => {
      writes += 1
      return {
        ...input,
        id: 'report-3',
        createdAt: '2026-10-19T12:00:00.000Z',
      }
    },
  })

  await assert.rejects(
    publish.execute('verified-subject', { ...draft, description: 'Muy corto' }),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal('field' in error ? error.field : undefined, 'description')
      assert.match(error.message, /20 caracteres/)
      return true
    },
  )
  assert.equal(writes, 0)
})
