import assert from 'node:assert/strict'
import test from 'node:test'

import { writeResult } from '../src/output.mjs'

const sink = () => {
  let value = ''
  return {
    stream: { write: (chunk) => (value += chunk) },
    value: () => value
  }
}

test('JSON mode emits exactly one parseable object to stdout', () => {
  const stdout = sink()
  const stderr = sink()
  writeResult({ ok: true, command: 'validate', artifacts: [] }, { json: true, stdout: stdout.stream, stderr: stderr.stream })

  assert.deepEqual(JSON.parse(stdout.value()), { ok: true, command: 'validate', artifacts: [] })
  assert.equal(stdout.value().split('\n').filter(Boolean).length, 1)
  assert.equal(stderr.value(), '')
})

test('human mode prints the result message without serializing the envelope', () => {
  const stdout = sink()
  const stderr = sink()
  writeResult({ ok: true, command: 'doctor', message: 'All required tools are available.' }, {
    json: false,
    stdout: stdout.stream,
    stderr: stderr.stream
  })

  assert.equal(stdout.value(), 'All required tools are available.\n')
  assert.equal(stderr.value(), '')
})

test('human mode directs failed result messages to stderr', () => {
  const stdout = sink()
  const stderr = sink()
  writeResult({ ok: false, command: 'verify', message: 'Audio stream is missing.' }, {
    json: false,
    stdout: stdout.stream,
    stderr: stderr.stream
  })

  assert.equal(stdout.value(), '')
  assert.equal(stderr.value(), 'Audio stream is missing.\n')
})
