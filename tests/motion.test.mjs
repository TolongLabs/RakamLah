import assert from 'node:assert/strict'
import test from 'node:test'

import { linearPosition, linearScroll } from '../engine/browser/motion.mjs'

test('linearPosition moves at a constant proportion and clamps progress', () => {
  assert.equal(linearPosition(10, 110, 0.25), 35)
  assert.equal(linearPosition(10, 110, -1), 10)
  assert.equal(linearPosition(10, 110, 2), 110)
})

test('linearScroll passes a zero duration when reduced motion is requested', async () => {
  const calls = []
  const page = {
    evaluate: async (fn, input) => {
      calls.push(input)
      return { startY: 20, targetY: 220, duration: input.duration }
    }
  }

  const result = await linearScroll(page, 220, { duration: 900, reducedMotion: true })
  assert.deepEqual(calls, [{ target: 220, duration: 0 }])
  assert.equal(result.duration, 0)
})

test('linearScroll rejects invalid duration without touching the page', async () => {
  let touched = false
  const page = { evaluate: async () => (touched = true) }
  await assert.rejects(linearScroll(page, 200, { duration: -1 }), /duration/)
  assert.equal(touched, false)
})
