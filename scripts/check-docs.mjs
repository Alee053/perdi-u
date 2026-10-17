import { execFileSync } from 'node:child_process'
import { realpath, readFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { checkDocuments } from './lib/repository-docs.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const { values } = parseArgs({ options: { since: { type: 'string' } } })
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const documents = git([
  'ls-files',
  '-z',
  '--cached',
  '--others',
  '--exclude-standard',
  '--',
  '*.md',
])
  .split('\0')
  .filter(Boolean)
const errors = await checkDocuments(root, documents)
const maintenance = JSON.parse(
  await readFile(new URL('../docs/maintenance-map.json', import.meta.url), 'utf8'),
)
for (const rule of maintenance) {
  for (const target of rule.review) {
    try {
      const path = relative(root, await realpath(resolve(root, target)))
      if (path === '..' || path.startsWith('..' + sep) || isAbsolute(path))
        throw new Error('outside')
    } catch {
      errors.push(`Mapa de mantenimiento: destino inválido o ausente: ${target}`)
    }
  }
}
if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else
  console.log(
    `Documentación verificada: ${documents.length} Markdown, skills y referencias locales válidas.`,
  )

if (values.since) {
  const base = git(['rev-parse', '--verify', '--end-of-options', `${values.since}^{commit}`])
  if (!/^[a-f0-9]{40,64}$/.test(base)) throw new Error('Base de comparación inválida.')
  const changed = [
    ...git(['diff', '--name-only', '-z', base, '--']).split('\0'),
    ...git(['ls-files', '-z', '--others', '--exclude-standard']).split('\0'),
  ].filter(Boolean)
  for (const rule of maintenance) {
    if (
      changed.some(
        (path) =>
          rule.prefixes.some((prefix) => path.startsWith(prefix)) ||
          rule.contains?.some((part) => path.includes(part)),
      )
    ) {
      console.log(`Revisar ${rule.area}: ${rule.review.join(', ')}`)
    }
  }
  console.log('El informe de impacto requiere revisión de contenido; no prueba vigencia semántica.')
}
