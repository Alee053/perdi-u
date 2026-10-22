// cross-spawn resolves pnpm's .cmd shim on Windows without passing arguments through a shell.
import { spawn } from 'cross-spawn'
import { randomBytes } from 'node:crypto'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    'with-browser': { type: 'boolean', default: false },
    'test-name-pattern': { type: 'string' },
  },
})
if (values['with-browser'] && values['test-name-pattern'])
  throw new Error('La aceptación completa no admite un filtro de pruebas.')

export async function run(command, args, env = {}, capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    })
    let output = ''
    if (capture) {
      child.stdout.on('data', (chunk) => {
        output += chunk
      })
      child.stderr.on('data', (chunk) => {
        output += chunk
      })
    }
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0 ? resolve(output.trim()) : reject(new Error(`Falló ${command} (código ${code}).`)),
    )
  })
}

const container = `perdiu-catalog-test-${randomBytes(6).toString('hex')}`
const password = randomBytes(24).toString('hex')
let started = false
try {
  await run(
    'docker',
    [
      'run',
      '-d',
      '--rm',
      '--name',
      container,
      '-e',
      'POSTGRES_PASSWORD',
      '-e',
      'POSTGRES_USER=perdiu',
      '-e',
      'POSTGRES_DB=perdiu_test',
      '-p',
      '127.0.0.1::5432',
      'postgres:17-alpine',
    ],
    { POSTGRES_PASSWORD: password },
    true,
  )
  started = true
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await run(
        'docker',
        ['exec', container, 'pg_isready', '-U', 'perdiu', '-d', 'perdiu_test'],
        {},
        true,
      )
      ready = true
      break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  if (!ready) throw new Error('PostgreSQL de pruebas no inició en 30 segundos.')
  const mapping = await run('docker', ['port', container, '5432/tcp'], {}, true)
  const port = mapping.match(/^127\.0\.0\.1:(\d+)$/)?.[1]
  if (!port) throw new Error('No se pudo determinar el puerto local de PostgreSQL de pruebas.')
  const env = {
    TEST_DATABASE_URL: `postgresql://perdiu:${password}@127.0.0.1:${port}/perdiu_test`,
    PERDIU_TEST_CONTAINER: '1',
    NODE_ENV: 'test',
  }
  if (values['test-name-pattern']) {
    await run('pnpm', ['exec', 'turbo', 'run', 'build', '--filter=@perdiu/api'])
    await run(
      'pnpm',
      [
        '--workspace-root',
        'exec',
        'jest',
        '--config',
        'jest.integration.config.cjs',
        '--runInBand',
        `--testNamePattern=${values['test-name-pattern']}`,
        '--runTestsByPath',
        'apps/api/test/catalog.integration.ts',
        'apps/api/test/auth.integration.ts',
        'apps/api/test/own-reports.integration.ts',
      ],
      env,
    )
  } else
    await run('pnpm', ['exec', 'turbo', 'run', 'test:integration', '--filter=@perdiu/api'], env)
  if (values['with-browser']) {
    await run('pnpm', ['build'], { VITE_API_BASE_URL: '/api' })
    await run(process.execPath, ['scripts/browser-catalog.mjs'], env)
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  if (started) await run('docker', ['stop', container], {}, true)
}
