import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPool } from '@perdiu/database'
import { migrate } from '@perdiu/database/maintenance'

// Runs the real compose.yaml (PostgreSQL, bootstrap, Supabase Auth, Mailpit) as a disposable
// Compose project with ephemeral ports and secrets, then exercises Auth and the API over HTTP.
const root = fileURLToPath(new URL('../', import.meta.url))
const project = `perdiu-auth-test-${randomBytes(4).toString('hex')}`

function run(command, args, { env = {}, input, capture = true } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: [input === undefined ? 'ignore' : 'pipe', capture ? 'pipe' : 'inherit', 'pipe'],
    })
    let output = ''
    let errors = ''
    child.stdout?.on('data', (chunk) => (output += chunk))
    child.stderr.on('data', (chunk) => (errors += chunk))
    if (input !== undefined) child.stdin.end(input)
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0
        ? resolve(output.trim())
        : reject(new Error(`Falló ${command} ${args[0]} (código ${code}).\n${errors.slice(-800)}`)),
    )
  })
}

async function freePort() {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  await new Promise((resolve) => server.close(resolve))
  return port
}

async function until(check, message, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const value = await check()
      if (value) return value
    } catch {
      /* Retry while the service starts or the e-mail arrives. */
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(message)
}

const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
const keys = [
  {
    ...privateKey.export({ format: 'jwk' }),
    kid: randomUUID(),
    use: 'sig',
    key_ops: ['sign', 'verify'],
    alg: 'ES256',
  },
]
const [authPort, mailPort, webPort] = [await freePort(), await freePort(), await freePort()]
const publicUrl = `http://127.0.0.1:${webPort}/auth`
const postgresPassword = randomBytes(18).toString('hex')
const directory = await mkdtemp(join(tmpdir(), 'perdiu-auth-'))
const envFile = join(directory, 'compose.env')
const overrideFile = join(directory, 'compose.override.yaml')
await writeFile(
  envFile,
  [
    `POSTGRES_PASSWORD=${postgresPassword}`,
    `AUTH_DB_PASSWORD=${randomBytes(18).toString('hex')}`,
    `AUTH_JWT_SECRET=${randomBytes(32).toString('hex')}`,
    `AUTH_JWT_KEYS='${JSON.stringify(keys)}'`,
    `AUTH_SITE_URL=http://127.0.0.1:${webPort}`,
    `AUTH_PUBLIC_URL=${publicUrl}`,
    `AUTH_REDIRECT_ALLOW_LIST=http://127.0.0.1:${webPort}/**`,
    'AUTH_MAILER_AUTOCONFIRM=false',
  ].join('\n'),
)
await writeFile(
  overrideFile,
  `services:
  postgres:
    ports: !override
      - '127.0.0.1::5432'
  auth:
    ports: !override
      - '127.0.0.1:${authPort}:9999'
  mail:
    ports: !override
      - '127.0.0.1:${mailPort}:8025'
`,
)
const compose = (...args) =>
  run('docker', [
    'compose',
    '-p',
    project,
    '--env-file',
    envFile,
    '-f',
    'compose.yaml',
    '-f',
    overrideFile,
    ...args,
  ])

let api
let started = false
try {
  started = true
  await compose('up', '-d', '--wait')
  const pgPort = (await compose('port', 'postgres', '5432')).split(':').pop()
  const databaseUrl = `postgresql://perdiu:${postgresPassword}@127.0.0.1:${pgPort}/perdiu_test`
  const sql = (database, query) =>
    compose('exec', '-T', 'postgres', 'psql', '-U', 'perdiu', '-d', database, '-Atc', query)
  await sql('perdiu_dev', 'CREATE DATABASE perdiu_test')
  const pool = createPool(databaseUrl)
  try {
    await migrate(pool)
  } finally {
    await pool.end()
  }

  // A second bootstrap on the same volume changes nothing and does not fail.
  await compose('run', '--rm', 'auth-db-init')
  console.log('✓ bootstrap idempotente: rol y base de Auth creados sin tocar perdiu_dev')
  assert.equal(
    await sql('perdiu_dev', "SELECT count(*) FROM pg_namespace WHERE nspname = 'auth'"),
    '0',
  )
  assert.equal(
    await sql(
      'perdiu_auth',
      "SELECT rolsuper OR rolcreaterole OR rolcreatedb FROM pg_roles WHERE rolname = 'perdiu_auth'",
    ),
    'f',
  )

  const apiPort = await freePort()
  api = spawn(process.execPath, ['apps/api/dist/main.js'], {
    cwd: root,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PORT: String(apiPort),
      HOST: '127.0.0.1',
      AUTH_JWKS_URL: `http://127.0.0.1:${authPort}/.well-known/jwks.json`,
      AUTH_JWT_ISSUER: publicUrl,
    },
    stdio: 'ignore',
  })
  const apiUrl = `http://127.0.0.1:${apiPort}`
  await until(async () => (await fetch(`${apiUrl}/reports`)).ok, 'La API no inició.')

  const auth = `http://127.0.0.1:${authPort}`
  const post = (path, body, headers = {}) =>
    fetch(`${auth}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  const email = `acceptance-${randomBytes(4).toString('hex')}@example.test`
  const password = `Clave-${randomBytes(6).toString('hex')}`

  const signup = await post('/signup', { email, password })
  assert.equal(signup.status, 200)
  assert.equal((await signup.json()).access_token, undefined, 'sin confirmar no hay sesión')
  const login = () => post('/token?grant_type=password', { email, password })
  const unconfirmed = await login()
  assert.equal(unconfirmed.status, 400)
  assert.equal((await unconfirmed.json()).error_code, 'email_not_confirmed')
  console.log('✓ registro: usuario creado en Auth y pendiente de confirmar su correo')

  const link = await until(async () => {
    const list = await (await fetch(`http://127.0.0.1:${mailPort}/api/v1/messages`)).json()
    const message = list.messages.find((item) => item.To[0].Address === email)
    if (!message) return undefined
    const detail = await (
      await fetch(`http://127.0.0.1:${mailPort}/api/v1/message/${message.ID}`)
    ).json()
    return detail.Text.match(/https?:\/\/[^\s)]+/)?.[0]
  }, 'No llegó el correo de confirmación.')
  assert.ok(link.startsWith(`${publicUrl}/verify?`), 'el enlace usa la URL pública de Auth')
  const verified = await fetch(link.replace(publicUrl, auth), { redirect: 'manual' })
  assert.equal(verified.status, 303)
  assert.equal(new URL(verified.headers.get('location')).origin, `http://127.0.0.1:${webPort}`)
  console.log('✓ el enlace de Mailpit confirma el correo y redirige al sitio permitido')

  const wrong = await post('/token?grant_type=password', { email, password: `${password}-x` })
  assert.equal(wrong.status, 400)
  assert.equal((await wrong.json()).error_code, 'invalid_credentials')
  const session = await (await login()).json()
  assert.ok(session.access_token && session.refresh_token)
  const [header] = session.access_token.split('.')
  assert.equal(JSON.parse(Buffer.from(header, 'base64url')).alg, 'ES256')
  console.log('✓ login: credenciales incorrectas rechazadas; correctas emiten un JWT ES256')

  const stored = await sql(
    'perdiu_auth',
    `SELECT count(*) FROM auth.users WHERE email = '${email}' AND email_confirmed_at IS NOT NULL AND encrypted_password LIKE '$2%'`,
  )
  assert.equal(stored, '1', 'la contraseña solo existe como hash bcrypt en auth.users')
  console.log('✓ PostgreSQL: el usuario confirmado vive en perdiu_auth.auth.users con hash bcrypt')

  const me = (token) =>
    fetch(`${apiUrl}/me`, token ? { headers: { authorization: `Bearer ${token}` } } : {})
  const identity = await me(session.access_token)
  assert.equal(identity.status, 200)
  const body = await identity.json()
  assert.deepEqual(Object.keys(body).sort(), ['email', 'id'])
  assert.equal(body.email, email)
  assert.equal((await me()).status, 401)
  assert.equal((await me(`${session.access_token.slice(0, -4)}AAAA`)).status, 401)
  console.log('✓ API: GET /me acepta el token real de Auth y rechaza ausente o adulterado')

  const refresh = (token) => post('/token?grant_type=refresh_token', { refresh_token: token })
  const renewed = await (await refresh(session.refresh_token)).json()
  assert.ok(renewed.access_token && renewed.refresh_token !== session.refresh_token)
  assert.equal((await me(renewed.access_token)).status, 200)
  // The web revokes the session in the API first: the still-signed token stops working at once.
  const revoked = await fetch(`${apiUrl}/me/logout`, {
    method: 'POST',
    headers: { authorization: `Bearer ${renewed.access_token}` },
  })
  assert.equal(revoked.status, 204)
  assert.equal((await me(renewed.access_token)).status, 401)
  console.log('✓ API: tras POST /me/logout el mismo access token ya no consulta /me')
  const logout = await fetch(`${auth}/logout?scope=local`, {
    method: 'POST',
    headers: { authorization: `Bearer ${renewed.access_token}` },
  })
  assert.equal(logout.status, 204)
  assert.equal((await refresh(renewed.refresh_token)).status, 400)
  console.log('✓ sesión: refresh con rotación; tras logout el refresh token queda revocado')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  if (api && api.exitCode === null) api.kill()
  if (started) await compose('down', '-v', '--remove-orphans').catch(() => undefined)
  await rm(directory, { recursive: true, force: true })
}
