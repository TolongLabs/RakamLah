import assert from 'node:assert/strict'
import test from 'node:test'

import { createBeatRecorder } from '../engine/browser/beats.mjs'

test('records expected beats once, in order, with elapsed milliseconds', () => {
  const times = [1000, 1125, 1450]
  const recorder = createBeatRecorder(['start', 'result'], () => times.shift())

  assert.deepEqual(recorder.mark('start'), { beat: 'start', atMs: 125 })
  assert.deepEqual(recorder.mark('result'), { beat: 'result', atMs: 450 })
  assert.deepEqual(recorder.audit(), [
    { beat: 'start', atMs: 125 },
    { beat: 'result', atMs: 450 }
  ])
})

test('rejects an out-of-order, duplicate, or unknown beat', () => {
  const recorder = createBeatRecorder(['start', 'result'], () => 0)
  assert.throws(() => recorder.mark('result'), (error) => error.exitCode === 4 && /Expected beat start/.test(error.message))
  recorder.mark('start')
  assert.throws(() => recorder.mark('start'), (error) => error.exitCode === 4 && /Expected beat result/.test(error.message))
  assert.throws(() => recorder.mark('unknown'), (error) => error.exitCode === 4 && /Expected beat result/.test(error.message))
})

test('audit rejects a capture that did not reach every beat', () => {
  const recorder = createBeatRecorder(['start', 'result'], () => 0)
  recorder.mark('start')
  assert.throws(() => recorder.audit(), (error) => error.exitCode === 4 && /Missing beats: result/.test(error.message))
})

test('rejects an invalid expected beat contract before recording', () => {
  assert.throws(() => createBeatRecorder([], () => 0), (error) => error.exitCode === 2)
  assert.throws(() => createBeatRecorder(['start', 'start'], () => 0), (error) => error.exitCode === 2)
})
