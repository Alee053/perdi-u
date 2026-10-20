import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from '@jest/globals'
import { webLayerViolations } from '../lib/web-layers.mjs'

const imports = (...specifiers) => specifiers.map((path) => `import x from '${path}'\n`).join('')

test('el Model no importa React, Presenters, Views, infraestructura ni APIs del navegador', () => {
  assert.deepEqual(
    webLayerViolations(
      'models/reports/filters.ts',
      imports('@perdiu/contracts', './report.js') + 'export const x = new TextEncoder()',
    ),
    [],
  )
  assert.equal(
    webLayerViolations(
      'models/reports/filters.ts',
      imports('react', '../../presenters/store.js', '../../infrastructure/demo/demo-reports.js') +
        'window.alert(1)',
    ).length,
    4,
  )
  assert.equal(webLayerViolations('models/reports/card.tsx', '').length, 1, 'sin JSX')
})

test('el núcleo del Presenter no usa React ni JSX; su adaptador use*.ts sí puede usar React', () => {
  assert.deepEqual(
    webLayerViolations(
      'presenters/catalog/catalog.presenter.ts',
      imports('@perdiu/contracts', '../../models/reports/filters.js', '../store.js'),
    ),
    [],
  )
  assert.deepEqual(webLayerViolations('presenters/useStore.ts', imports('react', './store.js')), [])
  assert.match(
    webLayerViolations('presenters/app/shell.presenter.ts', imports('react')).join(),
    /React/,
  )
  assert.equal(
    webLayerViolations(
      'presenters/app/useApp.ts',
      imports('../../views/pages/ExplorePage', '../../infrastructure/browser/browser-effects.js') +
        'document.title = ""',
    ).length,
    3,
  )
  assert.equal(webLayerViolations('presenters/app/Shell.tsx', '').length, 1, 'sin JSX')
})

test('la View usa Presenters y no importa Model, infraestructura ni contratos', () => {
  assert.deepEqual(
    webLayerViolations(
      'views/pages/ExplorePage.tsx',
      imports('react', 'lucide-react', '../../presenters/app/useApp', '../components/EmptyState'),
    ),
    [],
  )
  assert.equal(
    webLayerViolations(
      'views/pages/ExplorePage.tsx',
      imports(
        '../../models/reports/filters.js',
        '../../infrastructure/http/catalog-client.js',
        '@perdiu/contracts',
      ),
    ).length,
    3,
  )
})

test('la infraestructura implementa puertos del Model sin depender de Presenters ni Views', () => {
  assert.deepEqual(
    webLayerViolations(
      'infrastructure/auth/supabase-gateway.ts',
      imports('@supabase/auth-js', '../../models/auth/session.js'),
    ),
    [],
  )
  assert.equal(
    webLayerViolations(
      'infrastructure/http/catalog-client.ts',
      imports('../../presenters/catalog/catalog.presenter.js', 'react'),
    ).length,
    2,
  )
})

test('el código actual de apps/web/src respeta las capas MVP', async () => {
  const source = fileURLToPath(new URL('../../apps/web/src/', import.meta.url))
  const violations = []
  for (const entry of await readdir(source, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) continue
    const file = join(entry.parentPath, entry.name)
    const path = relative(source, file).replaceAll('\\', '/')
    violations.push(...webLayerViolations(path, await readFile(file, 'utf8')))
  }
  assert.deepEqual(violations, [])
})
