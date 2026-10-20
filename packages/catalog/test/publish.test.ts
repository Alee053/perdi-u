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
  whatsapp: '+59170000000',
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

test('la publicación recorta los espacios exteriores de la descripción persistida', async () => {
  let submitted: ReportCreation | undefined
  const publish = new CreateReport({
    create: async (input) => {
      submitted = input
      return {
        ...input,
        id: 'report-4',
        createdAt: '2026-10-19T12:00:00.000Z',
      }
    },
  })

  await publish.execute('verified-subject', {
    ...draft,
    description: `  ${draft.description}  `,
  })

  assert.equal(submitted?.description, draft.description)
})

test('la publicación rechaza un título vacío después de recortar espacios', async () => {
  let writes = 0
  const publish = new CreateReport({
    create: async (input) => {
      writes += 1
      return {
        ...input,
        id: 'report-5',
        createdAt: '2026-10-19T12:00:00.000Z',
      }
    },
  })

  await assert.rejects(
    () => publish.execute('verified-subject', { ...draft, title: '   ' }),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal('field' in error ? error.field : undefined, 'title')
      assert.match(error.message, /obligatorio/)
      return true
    },
  )
  assert.equal(writes, 0)
})

test('la publicación recorta los espacios exteriores del título persistido', async () => {
  let submitted: ReportCreation | undefined
  const publish = new CreateReport({
    create: async (input) => {
      submitted = input
      return {
        ...input,
        id: 'report-6',
        createdAt: '2026-10-19T12:00:00.000Z',
      }
    },
  })

  await publish.execute('verified-subject', { ...draft, title: `  ${draft.title}  ` })

  assert.equal(submitted?.title, draft.title)
})

test('la publicación rechaza títulos mayores a 200 caracteres antes de persistir', async () => {
  let writes = 0
  const publish = new CreateReport({
    create: async (input) => {
      writes += 1
      return {
        ...input,
        id: 'report-7',
        createdAt: '2026-10-19T12:00:00.000Z',
      }
    },
  })

  await assert.rejects(
    () => publish.execute('verified-subject', { ...draft, title: 'a'.repeat(201) }),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal('field' in error ? error.field : undefined, 'title')
      assert.match(error.message, /200 caracteres/)
      return true
    },
  )
  assert.equal(writes, 0)
})

test('la publicación rechaza una ciudad vacía antes de persistir', async () => {
  let writes = 0
  const publish = new CreateReport({
    create: async (input) => {
      writes += 1
      return {
        ...input,
        id: 'report-8',
        createdAt: '2026-10-19T12:00:00.000Z',
      }
    },
  })

  await assert.rejects(
    () => publish.execute('verified-subject', { ...draft, city: '   ' }),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal('field' in error ? error.field : undefined, 'city')
      assert.match(error.message, /ciudad/i)
      return true
    },
  )
  assert.equal(writes, 0)
})

test('la publicación normaliza separadores del WhatsApp antes de persistirlo', async () => {
  let submitted: ReportCreation | undefined
  const publish = new CreateReport({
    create: async (input) => {
      submitted = input
      return {
        ...input,
        id: 'report-9',
        createdAt: '2026-10-19T12:00:00.000Z',
      }
    },
  })

  await publish.execute('verified-subject', { ...draft, whatsapp: '+591 (7000) 0000' })

  assert.equal(submitted?.whatsapp, '+59170000000')
})

test('la publicación rechaza WhatsApp sin código de país antes de persistir', async () => {
  let writes = 0
  const publish = new CreateReport({
    create: async (input) => {
      writes += 1
      return {
        ...input,
        id: 'report-10',
        createdAt: '2026-10-19T12:00:00.000Z',
      }
    },
  })

  await assert.rejects(
    () => publish.execute('verified-subject', { ...draft, whatsapp: '70000000' }),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal('field' in error ? error.field : undefined, 'whatsapp')
      assert.match(error.message, /código de país/i)
      return true
    },
  )
  assert.equal(writes, 0)
})

test('la publicación rechaza una zona vacía antes de persistir', async () => {
  let writes = 0
  const publish = new CreateReport({
    create: async (input) => {
      writes += 1
      return {
        ...input,
        id: 'report-11',
        createdAt: '2026-10-19T12:00:00.000Z',
      }
    },
  })

  await assert.rejects(
    () => publish.execute('verified-subject', { ...draft, zone: '   ' }),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal('field' in error ? error.field : undefined, 'zone')
      assert.match(error.message, /zona/i)
      return true
    },
  )
  assert.equal(writes, 0)
})

test('la publicación rechaza una fecha de hecho inexistente antes de persistir', async () => {
  let writes = 0
  const publish = new CreateReport({
    create: async (input) => {
      writes += 1
      return {
        ...input,
        id: 'report-12',
        createdAt: '2026-10-19T12:00:00.000Z',
      }
    },
  })

  await assert.rejects(
    () => publish.execute('verified-subject', { ...draft, incidentDate: '2026-02-30' }),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal('field' in error ? error.field : undefined, 'incidentDate')
      assert.match(error.message, /fecha/i)
      return true
    },
  )
  assert.equal(writes, 0)
})

test('la publicación rechaza un tipo desconocido antes de persistir', async () => {
  let writes = 0
  const publish = new CreateReport({
    create: async (input) => {
      writes += 1
      return {
        ...input,
        id: 'report-13',
        createdAt: '2026-10-19T12:00:00.000Z',
      }
    },
  })

  await assert.rejects(
    () =>
      publish.execute('verified-subject', { ...draft, type: 'stolen' } as unknown as ReportDraft),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal('field' in error ? error.field : undefined, 'type')
      assert.match(error.message, /tipo/i)
      return true
    },
  )
  assert.equal(writes, 0)
})

test('la publicación rechaza una categoría desconocida antes de persistir', async () => {
  let writes = 0
  const publish = new CreateReport({
    create: async (input) => {
      writes += 1
      return {
        ...input,
        id: 'report-14',
        createdAt: '2026-10-19T12:00:00.000Z',
      }
    },
  })

  await assert.rejects(
    () =>
      publish.execute('verified-subject', {
        ...draft,
        category: 'vehicle',
      } as unknown as ReportDraft),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal('field' in error ? error.field : undefined, 'category')
      assert.match(error.message, /categoría/i)
      return true
    },
  )
  assert.equal(writes, 0)
})
