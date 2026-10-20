import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { webLayerViolations } from './lib/web-layers.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
// Allowed workspace dependencies; external runtime dependencies are restricted for pure modules.
const rules = {
  'apps/api': {
    workspaces: ['@perdiu/catalog', '@perdiu/database', '@perdiu/contracts'],
    forbidden: ['pg'],
  },
  'apps/web': {
    workspaces: ['@perdiu/contracts'],
    forbidden: ['pg', '@nestjs/common', '@nestjs/core'],
  },
  'packages/catalog': { workspaces: ['@perdiu/contracts'], pure: true },
  'packages/contracts': { workspaces: [], pure: true },
  'packages/database': {
    workspaces: ['@perdiu/catalog', '@perdiu/contracts'],
    forbidden: ['react', '@nestjs/common', '@nestjs/core'],
  },
}

for (const parent of ['apps', 'packages']) {
  for (const entry of await readdir(resolve(root, parent), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const directory = `${parent}/${entry.name}`
    assert.ok(
      Object.hasOwn(rules, directory),
      `Definir la responsabilidad y dependencias de ${directory}.`,
    )
  }
}

async function sources(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.turbo'].includes(entry.name)) continue
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await sources(path)))
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(path)
  }
  return files
}

for (const [directory, rule] of Object.entries(rules)) {
  const workspace = resolve(root, directory)
  const manifest = JSON.parse(await readFile(resolve(workspace, 'package.json'), 'utf8'))
  const runtime = Object.keys(manifest.dependencies ?? {})
  const declared = { ...manifest.dependencies, ...manifest.devDependencies }
  for (const dependency of Object.keys(declared)) {
    if (dependency.startsWith('@perdiu/'))
      assert.ok(
        rule.workspaces.includes(dependency),
        `${directory}: dependencia ${dependency} fuera de su responsabilidad.`,
      )
    assert.ok(
      !rule.forbidden?.includes(dependency),
      `${directory}: ${dependency} pertenece a otro módulo.`,
    )
  }
  if (rule.pure)
    assert.ok(
      runtime.every((dependency) => rule.workspaces.includes(dependency)),
      `${directory}: mantener el módulo independiente de infraestructura y frameworks.`,
    )
  for (const file of await sources(workspace)) {
    const content = await readFile(file, 'utf8')
    // Literal ESM imports/exports, including import('...'); calculated imports need review.
    for (const match of content.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"]+)\1/g)) {
      const specifier = match[2]
      if (specifier.startsWith('.')) {
        const target = relative(workspace, resolve(dirname(file), specifier))
        assert.ok(
          target !== '..' && !target.startsWith('../'),
          `${relative(root, file)}: importar otros workspaces mediante sus exports públicos.`,
        )
      } else if (specifier.startsWith('@perdiu/')) {
        const packageName = specifier.split('/').slice(0, 2).join('/')
        assert.ok(
          rule.workspaces.includes(packageName) && packageName in declared,
          `${relative(root, file)}: dependencia ${packageName} no permitida o no declarada.`,
        )
        const packageDirectory = Object.keys(rules).find(
          (path) => '@perdiu/' + path.split('/')[1] === packageName,
        )
        assert.ok(packageDirectory, `Workspace desconocido: ${packageName}`)
        const dependency = JSON.parse(
          await readFile(resolve(root, packageDirectory, 'package.json'), 'utf8'),
        )
        const subpath = specifier === packageName ? '.' : '.' + specifier.slice(packageName.length)
        assert.ok(
          Object.hasOwn(dependency.exports ?? {}, subpath),
          `${relative(root, file)}: ${specifier} no es un export público.`,
        )
      } else if (file.includes('/src/')) {
        assert.ok(
          !rule.forbidden?.some(
            (dependency) => specifier === dependency || specifier.startsWith(dependency + '/'),
          ),
          `${relative(root, file)}: import de infraestructura ajena.`,
        )
        if (rule.pure)
          assert.fail(`${relative(root, file)}: el módulo puro solo importa su código y contratos.`)
      }
    }
  }
}
// Inside apps/web, MVP layers: View -> Presenter -> Model, with infrastructure behind model ports.
const webSource = resolve(root, 'apps/web/src')
const layerViolations = []
for (const file of await sources(webSource)) {
  const path = relative(webSource, file).replaceAll('\\', '/')
  layerViolations.push(...webLayerViolations(path, await readFile(file, 'utf8')))
}
assert.deepEqual(layerViolations, [], `Capas MVP de apps/web:\n${layerViolations.join('\n')}`)

console.log(
  'Responsabilidades verificadas: api, web, catalog, contracts y database; imports entre workspaces mediante exports públicos; capas MVP de apps/web.',
)
