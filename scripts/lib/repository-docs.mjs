import { readFile, realpath } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'

function outside(root, path) {
  const part = relative(root, path)
  return part === '..' || part.startsWith('..' + sep) || isAbsolute(part)
}

// A deliberately small YAML subset: two unique keys and single-line text scalars.
function textScalar(value) {
  let text
  if (value.startsWith('"')) {
    try {
      text = JSON.parse(value)
    } catch {
      return undefined
    }
  } else if (value.startsWith("'")) {
    if (!/^'(?:[^']|'')*'$/.test(value)) return undefined
    text = value.slice(1, -1).replaceAll("''", "'")
  } else {
    if (
      !/^\p{L}/u.test(value) ||
      /:\s|:$|\s#/.test(value) ||
      /^(?:null|true|false|yes|no|on|off)$/i.test(value)
    )
      return undefined
    text = value
  }
  if (typeof text !== 'string' || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(text))
    return undefined
  return text
}

function skillMetadata(source) {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]
  if (!frontmatter) return undefined
  const metadata = {}
  for (const line of frontmatter.split(/\r?\n/)) {
    if (/^[ \t]*(?:#.*)?$/.test(line)) continue
    const field = line.match(/^(name|description):[ \t]+(.+)$/)
    if (!field || Object.hasOwn(metadata, field[1])) return undefined
    const value = textScalar(field[2].trim())
    if (value === undefined) return undefined
    metadata[field[1]] = value
  }
  return metadata
}

export async function checkDocuments(root, documents) {
  const base = await realpath(root)
  const errors = []
  for (const document of documents) {
    const path = resolve(base, document)
    if (outside(base, await realpath(path))) {
      errors.push(`${document}: documento fuera del repositorio.`)
      continue
    }
    const source = await readFile(path, 'utf8')
    if (basename(path) === 'SKILL.md') {
      const metadata = skillMetadata(source)
      if (!metadata)
        errors.push(
          `${document}: frontmatter inválido; usar name y description de texto en una línea.`,
        )
      const { name, description } = metadata ?? {}
      if (
        !name ||
        name !== basename(dirname(path)) ||
        name.length > 64 ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)
      )
        errors.push(`${document}: nombre de skill inválido o distinto de su carpeta.`)
      if (!description) errors.push(`${document}: falta una descripción de texto en una línea.`)
    }
    const prose = source.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '').replace(/`[^`\n]*`/g, '')
    const links = [...prose.matchAll(/!?\[[^\]\n]*\]\((<[^>]+>|[^)\s]+)(?:\s+"[^"]*")?\)/g)].map(
      (match) => match[1],
    )
    links.push(
      ...[...prose.matchAll(/^\s*\[[^\]\n]+\]:\s*(<[^>]+>|\S+)/gm)].map((match) => match[1]),
    )
    for (const target of links) {
      const link = target.replace(/^<|>$/g, '')
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(link)) continue
      try {
        const destination = resolve(dirname(path), decodeURIComponent(link.split(/[?#]/)[0]))
        if (outside(base, destination) || outside(base, await realpath(destination)))
          throw new Error('outside')
      } catch {
        errors.push(`${document}: enlace local inválido o ausente: ${link}`)
      }
    }
  }
  return errors
}
