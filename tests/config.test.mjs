import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { loadConfig } from '../src/config.mjs'

const makeConfig = async (source) => {
  const root = await mkdtemp(join(tmpdir(), 'rakamlah-config-'))
  const path = join(root, 'rakam.config.mjs')
  await writeFile(path, source)
  return { path, root }
}

test('loads defaults and resolves project paths from the config directory', async () => {
  const { path, root } = await makeConfig(`export default {
    project: 'fixture',
    scenario: './scenario.mjs',
    narration: './narration.txt'
  }`)

  const config = await loadConfig(path)

  assert.equal(config.project, 'fixture')
  assert.equal(config.scenario, join(root, 'scenario.mjs'))
  assert.equal(config.narration, join(root, 'narration.txt'))
  assert.equal(config.outputDir, join(root, '.rakam/out'))
  assert.deepEqual(config.browser.viewport, { width: 1440, height: 900 })
  assert.deepEqual(config.video, { width: 1920, height: 1080, minDuration: 60, maxDuration: 120, preset: 'slow' })
  assert.deepEqual(config.subtitles, {
    font: 'Quicksand',
    fontSize: 18,
    horizontalMargin: 80,
    verticalMargin: 28,
    maxRows: 2
  })
  assert.deepEqual(config.tts, { engine: 'kokoro', speed: 1, voice: 'af_heart', reference: null })
  assert.deepEqual(config.bgm, { path: null, gainDb: -17 })
  assert.ok(Object.isFrozen(config))
})

test('resolves optional voice and BGM paths from the config directory', async () => {
  const { path, root } = await makeConfig(`export default {
    project: 'fixture', scenario: './scenario.mjs', narration: './narration.txt',
    tts: { engine: 'chatterbox', reference: './voice.mp3', speed: 1.1 },
    bgm: { path: './music.mp3', gainDb: -20 }
  }`)

  const config = await loadConfig(path)
  assert.equal(config.tts.reference, join(root, 'voice.mp3'))
  assert.equal(config.bgm.path, join(root, 'music.mp3'))
  assert.equal(config.tts.speed, 1.1)
  assert.equal(config.bgm.gainDb, -20)
})

test('rejects a missing required field', async () => {
  const { path } = await makeConfig(`export default { project: 'fixture', scenario: './scenario.mjs' }`)
  await assert.rejects(loadConfig(path), (error) => error.exitCode === 2 && /narration/.test(error.message))
})

test('rejects invalid duration bounds', async () => {
  const { path } = await makeConfig(`export default {
    project: 'fixture', scenario: './scenario.mjs', narration: './narration.txt',
    video: { minDuration: 120, maxDuration: 60 }
  }`)
  await assert.rejects(loadConfig(path), (error) => error.exitCode === 2 && /duration/i.test(error.message))
})

test('rejects nonpositive dimensions and subtitle rows outside one or two', async () => {
  const badWidth = await makeConfig(`export default {
    project: 'fixture', scenario: './scenario.mjs', narration: './narration.txt', video: { width: 0 }
  }`)
  await assert.rejects(loadConfig(badWidth.path), (error) => error.exitCode === 2 && /width/.test(error.message))

  const badRows = await makeConfig(`export default {
    project: 'fixture', scenario: './scenario.mjs', narration: './narration.txt', subtitles: { maxRows: 3 }
  }`)
  await assert.rejects(loadConfig(badRows.path), (error) => error.exitCode === 2 && /maxRows/.test(error.message))
})
