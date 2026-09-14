import { spawn } from 'node:child_process'
import { writeSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { main } from './cli.mjs'

const WORKER_MARKER = 'RAKAM_INTERNAL_JSON_WORKER'
const executable = fileURLToPath(new URL('../bin/rakam.mjs', import.meta.url))

const resultFd = {
  write(chunk) {
    writeSync(3, chunk)
    return true
  }
}

const fallback = (message) => ({
  ok: false,
  command: null,
  exitCode: 4,
  message
})

const emitResult = (value) => {
  process.stdout.write(`${JSON.stringify(value)}\n`)
}

const isolatedJson = (argv) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [executable, ...argv], {
      env: { ...process.env, [WORKER_MARKER]: '1' },
      stdio: ['inherit', 'pipe', 'inherit', 'pipe']
    })
    const resultChunks = []
    let settled = false

    child.stdout.on('data', (chunk) => process.stderr.write(chunk))
    child.stdio[3].on('data', (chunk) => resultChunks.push(chunk))

    const finish = (exitCode, error) => {
      if (settled) return
      settled = true
      const raw = Buffer.concat(resultChunks).toString('utf8').trim()
      try {
        if (error) throw error
        const parsed = JSON.parse(raw)
        emitResult(parsed)
        resolve(Number.isInteger(exitCode) ? exitCode : parsed.exitCode || 4)
      } catch (failure) {
        emitResult(fallback(`JSON worker failed: ${failure.message}`))
        resolve(4)
      }
    }

    child.once('error', (error) => finish(4, error))
    child.once('close', (code, signal) => {
      const error = signal ? new Error(`worker exited after signal ${signal}`) : null
      finish(code, error)
    })
  })

export const runEntrypoint = async (argv) => {
  if (process.env[WORKER_MARKER] === '1') {
    delete process.env[WORKER_MARKER]
    return main(argv, { stdout: resultFd })
  }
  if (argv.includes('--json')) return isolatedJson(argv)
  return main(argv)
}
