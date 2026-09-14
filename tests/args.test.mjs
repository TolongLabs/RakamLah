import assert from 'node:assert/strict'
import test from 'node:test'

import { parseArgs } from '../src/args.mjs'

test('parses a headless command with config and JSON output', () => {
  assert.deepEqual(parseArgs(['capture', '--config', 'demo/rakam.config.mjs', '--json']), {
    command: 'capture',
    configPath: 'demo/rakam.config.mjs',
    help: false,
    json: true
  })
})

test('accepts every public command', () => {
  for (const command of ['doctor', 'validate', 'capture', 'narrate', 'run', 'verify']) {
    assert.equal(parseArgs([command]).command, command)
  }
})

test('recognizes global help without requiring a command', () => {
  assert.deepEqual(parseArgs(['--help']), {
    command: null,
    configPath: 'rakam.config.mjs',
    help: true,
    json: false
  })
})

test('rejects an unknown command as invalid input', () => {
  assert.throws(
    () => parseArgs(['film']),
    (error) => error.exitCode === 2 && /Unknown command/.test(error.message)
  )
})

test('rejects an option without its value', () => {
  assert.throws(
    () => parseArgs(['validate', '--config']),
    (error) => error.exitCode === 2 && /--config/.test(error.message)
  )
})
