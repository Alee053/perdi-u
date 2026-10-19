import assert from 'node:assert/strict'
import { execFile, execFileSync } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { test } from '@jest/globals'

const exec = promisify(execFile)
const source = fileURLToPath(new URL('../../', import.meta.url))
const fixtureEnv = { ...process.env }
// A parent Git hook can export paths/config belonging to the real repository.
for (const name of execFileSync('git', ['rev-parse', '--local-env-vars'], { encoding: 'utf8' })
  .trim()
  .split('\n'))
  delete fixtureEnv[name]
delete fixtureEnv.HUSKY
delete fixtureEnv.HUSKY_SKIP_TRACK

async function command(root, executable, args) {
  try {
    // Windows resolves pnpm to a .cmd shim, which Node only runs through a shell.
    const shell = process.platform === 'win32' && executable === 'pnpm'
    const result = await exec(executable, args, {
      cwd: root,
      env: fixtureEnv,
      timeout: 30000,
      shell,
    })
    return { code: 0, ...result }
  } catch (error) {
    if (typeof error.code !== 'number') throw error
    return { code: error.code, stdout: error.stdout, stderr: error.stderr }
  }
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'perdiu-tddlab-'))
  for (const directory of ['script', 'scripts', '.husky']) await mkdir(join(root, directory))
  for (const path of [
    'script/tddScript.js',
    'script/commitScript.js',
    'script/commit-tracker.js',
    'script/id_execution_tests_commit.js',
    'scripts/run-tdd.mjs',
    '.husky/pre-commit',
    '.husky/post-commit',
    '.husky/commit-msg',
    'semantic-commits.js',
    '.npmrc',
  ])
    await copyFile(join(source, path), join(root, path))
  await symlink(join(source, 'node_modules'), join(root, 'node_modules'), 'junction')
  await writeFile(
    join(root, '.gitignore'),
    'node_modules/\n.husky/_/\ncoverage/\nscript/report.json\n',
  )
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      private: true,
      type: 'module',
      packageManager: 'pnpm@10.29.2',
      scripts: { test: 'node scripts/run-tdd.mjs' },
      devDependencies: { jest: '29.7.0' },
    }),
  )
  await writeFile(
    join(root, 'jest.config.cjs'),
    "module.exports = { testMatch: ['<rootDir>/probe.test.js'], maxWorkers: 1 }\n",
  )
  await writeFile(join(root, 'answer.js'), 'export const answer = () => 41\n')
  await writeFile(
    join(root, 'probe.test.js'),
    "import { answer } from './answer.js'\ntest('devuelve la respuesta esperada', () => expect(answer()).toBe(42))\n",
  )
  return root
}

const json = async (root, name) => JSON.parse(await readFile(join(root, 'script', name), 'utf8'))

test('TDDLab registra rojo y verde y vincula dos commits con sus pruebas y cobertura', async () => {
  const root = await fixture()
  try {
    for (const args of [
      ['init', '--initial-branch=main'],
      ['config', 'user.name', 'Prueba local'],
      ['config', 'user.email', 'test@example.invalid'],
      ['config', 'commit.gpgsign', 'false'],
      ['remote', 'add', 'origin', 'https://example.invalid/perdi-u.git'],
      ['add', '.'],
      ['-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'chore: preparar fixture'],
    ])
      assert.equal((await command(root, 'git', args)).code, 0)
    assert.equal((await command(root, 'pnpm', ['exec', 'husky'])).code, 0)

    assert.equal((await command(root, 'pnpm', ['test'])).code, 1)
    await writeFile(join(root, 'answer.js'), 'export const answer = () => 42\n')
    assert.equal((await command(root, 'pnpm', ['test'])).code, 0)
    const runs = await json(root, 'tdd_log.json')
    assert.deepEqual(
      runs.map(({ success, failedTests, testId }) => ({ success, failedTests, testId })),
      [
        { success: false, failedTests: 1, testId: 0 },
        { success: true, failedTests: 0, testId: 0 },
      ],
    )

    await command(root, 'git', ['add', 'answer.js'])
    const first = await command(root, 'git', ['commit', '-m', 'fix: responder correctamente'])
    assert.equal(first.code, 0, first.stderr)
    const firstSha = (await command(root, 'git', ['rev-parse', 'HEAD'])).stdout.trim()
    assert.equal((await command(root, 'git', ['status', '--porcelain'])).stdout.trim(), '')
    assert.equal((await json(root, 'tdd_log.json')).at(-1).commitId, 'HEAD')
    const firstHistory = (await json(root, 'commit-history.json')).at(-1)
    assert.equal(firstHistory.sha, 'HEAD')
    assert.equal(firstHistory.test_count, 1)
    assert.equal(firstHistory.failed_tests, 0)
    assert.equal(firstHistory.conclusion, 'success')
    assert.ok(firstHistory.coverage > 0)

    assert.equal((await command(root, 'pnpm', ['test'])).code, 0)
    assert.equal((await json(root, 'tdd_log.json')).at(-1).testId, 1)
    await writeFile(join(root, 'README.md'), '# Fixture local\n')
    await command(root, 'git', ['add', 'README.md'])
    const second = await command(root, 'git', ['commit', '-m', 'docs: describir fixture'])
    assert.equal(second.code, 0, second.stderr)
    const history = await json(root, 'commit-history.json')
    assert.equal(history[0].sha, firstSha)
    assert.equal(history[1].sha, 'HEAD')
    const commits = (await json(root, 'tdd_log.json')).filter((entry) => 'commitId' in entry)
    assert.equal(commits[0].commitId, firstSha)
    assert.equal(commits[1].commitId, 'HEAD')
    assert.equal((await command(root, 'git', ['status', '--porcelain'])).stdout.trim(), '')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 60000)

test('el comando TDD rechaza una ejecución sin pruebas aunque exista un reporte verde anterior', async () => {
  const root = await fixture()
  try {
    await rm(join(root, 'probe.test.js'))
    await writeFile(
      join(root, 'script/report.json'),
      JSON.stringify({ success: true, numTotalTests: 1 }),
    )
    assert.equal((await command(root, 'pnpm', ['test'])).code, 1)
    await assert.rejects(readFile(join(root, 'script/report.json')), { code: 'ENOENT' })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 30000)
