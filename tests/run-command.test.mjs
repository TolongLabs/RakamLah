import assert from 'node:assert/strict'
import test from 'node:test'

import { run } from '../src/commands/run.mjs'

test('run carries one run directory through capture, narration, and verification', async () => {
  const calls = []
  const config = { project: 'fixture' }
  const result = await run(config, {
    capture: async () => {
      calls.push(['capture'])
      return { ok: true, command: 'capture', runDir: '/runs/one', runId: 'one' }
    },
    narrate: async (_config, dependencies) => {
      calls.push(['narrate', dependencies.runDir])
      return { ok: true, command: 'narrate', runDir: dependencies.runDir, outputPath: '/runs/one/demo.mp4' }
    },
    verify: async (_config, dependencies) => {
      calls.push(['verify', dependencies.runDir])
      return { ok: true, command: 'verify', runDir: dependencies.runDir, duration: 70 }
    }
  })

  assert.deepEqual(calls, [['capture'], ['narrate', '/runs/one'], ['verify', '/runs/one']])
  assert.equal(result.ok, true)
  assert.equal(result.command, 'run')
  assert.equal(result.runDir, '/runs/one')
  assert.equal(result.outputPath, '/runs/one/demo.mp4')
  assert.equal(result.verification.duration, 70)
})
