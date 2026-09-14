import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { capture } from '../src/commands/capture.mjs'

const baseConfig = (outputDir) => ({
  project: 'fixture',
  scenario: '/fixture/scenario.mjs',
  outputDir,
  browser: { viewport: { width: 1440, height: 900 }, channel: null, headless: true }
})

const harness = () => {
  const events = []
  const video = { path: async () => '/fixture/raw.webm' }
  const page = { video: () => video }
  const context = {
    newPage: async () => {
      events.push('page')
      return page
    },
    close: async () => events.push('context-close')
  }
  const browser = {
    newContext: async (options) => {
      events.push(['context', options])
      return context
    },
    close: async () => events.push('browser-close')
  }
  const playwright = { chromium: { launch: async () => (events.push('launch'), browser) } }
  return { browser, context, events, page, playwright }
}

test('capture warms first, records the adapter, audits, and writes run-scoped beats', async () => {
  const outputDir = await mkdtemp(join(tmpdir(), 'rakamlah-capture-'))
  const fake = harness()
  const scenario = {
    expectedBeats: ['start', 'finish'],
    warmup: async () => fake.events.push('warmup'),
    walk: async ({ mark }) => {
      fake.events.push('walk')
      mark('start')
      mark('finish')
    },
    audit: async ({ beats }) => fake.events.push(['audit', beats.length])
  }

  const result = await capture(baseConfig(outputDir), {
    playwright: fake.playwright,
    loadScenario: async () => scenario,
    makeRunId: () => 'run-001',
    clock: (() => {
      const values = [100, 125, 200]
      return () => values.shift()
    })(),
    moveVideo: async (from, to) => fake.events.push(['move', from, to])
  })

  assert.equal(result.ok, true)
  assert.equal(result.runId, 'run-001')
  assert.equal(result.runDir, join(outputDir, 'run-001'))
  assert.deepEqual(result.beats, [
    { beat: 'start', atMs: 25 },
    { beat: 'finish', atMs: 100 }
  ])
  assert.deepEqual(JSON.parse(await readFile(join(outputDir, 'run-001', 'beats.json'), 'utf8')), result.beats)
  assert.deepEqual(fake.events.map((event) => (Array.isArray(event) ? event[0] : event)), [
    'launch',
    'warmup',
    'context',
    'page',
    'walk',
    'audit',
    'context-close',
    'move',
    'browser-close'
  ])
})

test('capture closes the recording context and browser after an adapter failure', async () => {
  const outputDir = await mkdtemp(join(tmpdir(), 'rakamlah-capture-'))
  const fake = harness()
  const scenario = {
    expectedBeats: ['start'],
    walk: async () => {
      throw new Error('adapter failed')
    }
  }

  await assert.rejects(
    capture(baseConfig(outputDir), {
      playwright: fake.playwright,
      loadScenario: async () => scenario,
      makeRunId: () => 'run-002',
      moveVideo: async () => {}
    }),
    (error) => error.exitCode === 4 && /adapter failed/.test(error.message)
  )
  assert.ok(fake.events.includes('context-close'))
  assert.ok(fake.events.includes('browser-close'))
})

test('capture closes the browser when warmup fails before a recording context exists', async () => {
  const outputDir = await mkdtemp(join(tmpdir(), 'rakamlah-capture-'))
  const fake = harness()
  await assert.rejects(
    capture(baseConfig(outputDir), {
      playwright: fake.playwright,
      loadScenario: async () => ({
        expectedBeats: ['start'],
        warmup: async () => {
          throw new Error('not ready')
        },
        walk: async () => {}
      }),
      makeRunId: () => 'run-003'
    }),
    (error) => error.exitCode === 4 && /not ready/.test(error.message)
  )
  assert.ok(fake.events.includes('browser-close'))
  assert.equal(fake.events.some((event) => Array.isArray(event) && event[0] === 'context'), false)
})
