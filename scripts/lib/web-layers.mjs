import { posix } from 'node:path'

/**
 * MVP layers of apps/web/src. Paths are relative to that folder; the first segment is the layer.
 * `app` is the composition root and may connect every layer.
 */
const layers = {
  models: { layers: ['models', 'shared'], packages: ['@perdiu/contracts'] },
  presenters: { layers: ['presenters', 'models', 'shared'], packages: ['@perdiu/contracts'] },
  views: { layers: ['views', 'presenters', 'shared'], packages: ['react', 'lucide-react'] },
  infrastructure: {
    layers: ['infrastructure', 'models', 'shared'],
    packages: ['@perdiu/contracts', '@supabase/auth-js'],
  },
  shared: { layers: ['shared'], packages: [] },
  app: {
    layers: ['app', 'views', 'presenters', 'models', 'infrastructure', 'shared'],
    packages: ['react', 'react-dom'],
  },
}
// Global objects only: `'/images/document.svg'` or `report.window` are not browser APIs.
const browserApis =
  /(?<![\w$./'"-])(?:window|document|localStorage|sessionStorage|navigator)\s*\.|(?<![\w$.])fetch\s*\(/

const specifiers = (content) =>
  // Literal ESM imports/exports, including import('...') and type-only imports.
  [...content.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"]+)\1/g)].map((match) => match[2])
const matchesPackage = (specifier, name) => specifier === name || specifier.startsWith(name + '/')

/** Returns the rule violations of one source file of apps/web/src. */
export function webLayerViolations(path, content) {
  const layer = path.split('/')[0]
  const rule = layers[layer]
  if (!rule) return [`${path}: ubicar el archivo en una capa (${Object.keys(layers).join(', ')}).`]
  const violations = []
  // React adapters of the presenter layer are the `use*.ts` hooks; the core stays framework-free.
  const presenterHook = layer === 'presenters' && /^use[A-Z]\w*\.ts$/.test(posix.basename(path))
  const packages = presenterHook ? [...rule.packages, 'react'] : rule.packages

  if (['models', 'presenters'].includes(layer) && path.endsWith('.tsx'))
    violations.push(`${path}: ${layer} no contiene JSX; los componentes pertenecen a views.`)
  if (['models', 'presenters'].includes(layer) && browserApis.test(content))
    violations.push(
      `${path}: usar APIs del navegador mediante infrastructure y efectos inyectados.`,
    )

  for (const specifier of specifiers(content)) {
    if (specifier.startsWith('.')) {
      const target = posix.normalize(posix.join(posix.dirname(path), specifier)).split('/')[0]
      if (!rule.layers.includes(target))
        violations.push(`${path}: ${layer} no debe importar ${target} (${specifier}).`)
    } else if (!packages.some((name) => matchesPackage(specifier, name))) {
      const hint =
        layer === 'presenters' && matchesPackage(specifier, 'react')
          ? 'React solo se usa en los adaptadores use*.ts'
          : 'dependencia fuera de su capa'
      violations.push(`${path}: ${hint} (${specifier}).`)
    }
  }
  return violations
}
