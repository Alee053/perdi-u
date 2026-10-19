import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from '@jest/globals'
import { checkDocuments } from '../lib/repository-docs.mjs'

test('la verificación documental detecta un enlace local roto', async () => {
  const root = await mkdtemp(join(tmpdir(), 'perdiu-docs-'))
  try {
    await writeFile(join(root, 'README.md'), '[Guía](missing.md)\n')
    const errors = await checkDocuments(root, ['README.md'])
    assert.ok(errors.some((error) => error.includes('missing.md')))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('las skills deben declarar nombre coherente y descripción útil', async () => {
  const root = await mkdtemp(join(tmpdir(), 'perdiu-docs-'))
  const skill = '.agents/skills/perdiu-demo/SKILL.md'
  try {
    await mkdir(join(root, '.agents/skills/perdiu-demo'), { recursive: true })
    await writeFile(join(root, skill), '---\nname: other-name\n---\n# Skill\n')
    const errors = await checkDocuments(root, [skill])
    assert.ok(errors.some((error) => error.includes('nombre')))
    assert.ok(errors.some((error) => error.includes('descripción')))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('los enlaces de referencia rotos también se detectan', async () => {
  const root = await mkdtemp(join(tmpdir(), 'perdiu-docs-'))
  try {
    await writeFile(join(root, 'README.md'), '[Guía][testing]\n\n[testing]: absent.md\n')
    const errors = await checkDocuments(root, ['README.md'])
    assert.ok(errors.some((error) => error.includes('absent.md')))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('la metadata rechaza YAML inválido y valores que no son texto', async () => {
  const root = await mkdtemp(join(tmpdir(), 'perdiu-docs-'))
  const skill = '.agents/skills/perdiu-demo/SKILL.md'
  try {
    await mkdir(join(root, '.agents/skills/perdiu-demo'), { recursive: true })
    for (const description of [
      'Reglas: usar el flujo de PerdiU.',
      '123',
      'true',
      'null',
      '[usar, revisar]',
      'Usar reglas.\nunknown: [',
      'Usar reglas.\ndescription: Otro texto.',
    ]) {
      await writeFile(
        join(root, skill),
        `---\nname: perdiu-demo\ndescription: ${description}\n---\n# Skill\n`,
      )
      assert.ok((await checkDocuments(root, [skill])).length > 0, description)
    }
    for (const description of [
      '"123"',
      "'Reglas: usar el flujo de PerdiU.'",
      "'Texto con ''comillas''.'",
    ]) {
      await writeFile(
        join(root, skill),
        `---\nname: perdiu-demo\ndescription: ${description}\n---\n# Skill\n`,
      )
      assert.deepEqual(await checkDocuments(root, [skill]), [], description)
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('documentos y skills válidos admiten enlaces anclados y ejemplos sin contactar la red', async () => {
  const root = await mkdtemp(join(tmpdir(), 'perdiu-docs-'))
  try {
    const skill = '.agents/skills/perdiu-demo/SKILL.md'
    await mkdir(join(root, '.agents/skills/perdiu-demo'), { recursive: true })
    await writeFile(join(root, 'README.md'), '# Inicio\n')
    await writeFile(
      join(root, skill),
      '---\nname: perdiu-demo\ndescription: Usar reglas concretas de este repositorio.\n---\n[Guía](../../../README.md#inicio)\n[Web](https://example.invalid)\n```md\n[Ejemplo](absent.md)\n```\n',
    )
    assert.deepEqual(await checkDocuments(root, [skill, 'README.md']), [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('un enlace no puede escapar del repositorio mediante ruta o symlink', async () => {
  const root = await mkdtemp(join(tmpdir(), 'perdiu-docs-'))
  try {
    await symlink(tmpdir(), join(root, 'outside'), 'junction')
    await writeFile(join(root, 'README.md'), '[Ruta](../)\n[Symlink](outside/)\n')
    const errors = await checkDocuments(root, ['README.md'])
    assert.equal(errors.length, 2)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
