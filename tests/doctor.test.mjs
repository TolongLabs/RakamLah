import assert from 'node:assert/strict'
import test from 'node:test'

import { doctor } from '../src/commands/doctor.mjs'

const config = {
  scenario: '/fixture/scenario.mjs',
  narration: '/fixture/narration.txt',
  bgm: { path: null },
  tts: { engine: 'kokoro', reference: null }
}

test('doctor reports every required executable and configured file', async () => {
  const result = await doctor(config, {
    commandExists: async () => true,
    pathExists: async () => true,
    playwrightAvailable: async () => true,
    nodeVersion: '22.22.1'
  })

  assert.equal(result.ok, true)
  assert.equal(result.command, 'doctor')
  assert.deepEqual(
    result.checks.map(({ name, ok, required }) => ({ name, ok, required })),
    [
      { name: 'node', ok: true, required: true },
      { name: 'python3', ok: true, required: true },
      { name: 'ffmpeg', ok: true, required: true },
      { name: 'ffprobe', ok: true, required: true },
      { name: 'playwright', ok: true, required: true },
      { name: 'scenario', ok: true, required: true },
      { name: 'narration', ok: true, required: true }
    ]
  )
})

test('doctor rejects a missing required executable with exit code 3', async () => {
  await assert.rejects(
    doctor(config, {
      commandExists: async (name) => name !== 'ffmpeg',
      pathExists: async () => true,
      playwrightAvailable: async () => true,
      nodeVersion: '22.22.1'
    }),
    (error) => error.exitCode === 3 && /ffmpeg/.test(error.message)
  )
})

test('doctor treats configured BGM and reference voice as required files', async () => {
  const withMedia = {
    ...config,
    bgm: { path: '/fixture/music.mp3' },
    tts: { engine: 'chatterbox', reference: '/fixture/voice.mp3' }
  }
  await assert.rejects(
    doctor(withMedia, {
      commandExists: async () => true,
      pathExists: async (path) => path !== '/fixture/voice.mp3',
      playwrightAvailable: async () => true,
      nodeVersion: '22.22.1'
    }),
    (error) => error.exitCode === 3 && /voice reference/.test(error.message)
  )
})
