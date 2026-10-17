import { spawn } from 'node:child_process'
import { readFile, rm } from 'node:fs/promises'

// Keep TDDLab's recorder unchanged, but preserve Jest's failure at the command boundary.
const reportPath = new URL('../script/report.json', import.meta.url)
await rm(reportPath, { force: true })

const code = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['script/tddScript.js'], { stdio: 'inherit' })
  child.on('error', reject)
  child.on('exit', resolve)
})
if (code !== 0) throw new Error('El registro de TDDLab no terminó correctamente.')

const report = JSON.parse(await readFile(reportPath, 'utf8'))
if (!Number.isSafeInteger(report.numTotalTests) || report.numTotalTests < 1)
  throw new Error('Jest no ejecutó ninguna prueba; revisa su configuración.')
if (
  report.success !== true ||
  report.numFailedTests > 0 ||
  report.numFailedTestSuites > 0 ||
  report.numRuntimeErrorTestSuites > 0
)
  process.exitCode = 1
