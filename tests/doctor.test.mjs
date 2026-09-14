import assert from 'node:assert/strict'
import test from 'node:test'

import { doctor, probeBrowser, probeTts } from '../src/commands/doctor.mjs'

const config = {
  scenario: '/fixture/scenario.mjs',
  narration: '/fixture/narration.txt',
  browser: { channel: null, headless: true },
  bgm: { path: null },
  tts: { engine: 'kokoro', reference: null }
}

const ready = {
  browserAvailable: async () => true,
  commandExists: async () => true,
  ffmpegCapabilities: async () => ({ libx264: true, subtitles: true }),
  pathExists: async () => true,
  playwrightAvailable: async () => true,
  ttsAvailable: async () => ({ packages: true, models: true }),
  nodeVersion: '22.22.1'
}

test('doctor reports every required executable and configured file', async () => {
  const result = await doctor(config, {
    ...ready
  })

  assert.equal(result.ok, true)
  assert.equal(result.command, 'doctor')
  assert.deepEqual(
    result.checks.map(({ name, ok, required }) => ({ name, ok, required })),
    [
      { name: 'node', ok: true, required: true },
      { name: 'bash', ok: true, required: true },
      { name: 'python', ok: true, required: true },
      { name: 'ffmpeg', ok: true, required: true },
      { name: 'ffprobe', ok: true, required: true },
      { name: 'playwright', ok: true, required: true },
      { name: 'chromium', ok: true, required: true },
      { name: 'ffmpeg-libx264', ok: true, required: true },
      { name: 'ffmpeg-subtitles', ok: true, required: true },
      { name: 'scenario', ok: true, required: true },
      { name: 'narration', ok: true, required: true },
      { name: 'kokoro-packages', ok: true, required: true },
      { name: 'kokoro-models', ok: true, required: true }
    ]
  )
})

test('doctor rejects a missing required executable with exit code 3', async () => {
  await assert.rejects(
    doctor(config, {
      ...ready,
      commandExists: async (name) => name !== 'ffmpeg'
    }),
    (error) => error.exitCode === 3 && /ffmpeg/.test(error.message)
  )
})

test('doctor checks the configured Python override, browser binary, FFmpeg features, and TTS runtime', async () => {
  const commands = []
  await assert.rejects(
    doctor(config, {
      ...ready,
      environment: { RAKAM_PYTHON: '/fixture/venv/bin/python' },
      commandExists: async (name) => {
        commands.push(name)
        return name !== '/fixture/venv/bin/python'
      },
      browserAvailable: async () => false,
      ffmpegCapabilities: async () => ({ libx264: false, subtitles: false }),
      ttsAvailable: async () => ({ packages: false, models: false })
    }),
    (error) => {
      assert.equal(error.exitCode, 3)
      assert.match(error.message, /python/i)
      assert.match(error.message, /chromium/i)
      assert.match(error.message, /libx264/i)
      assert.match(error.message, /subtitles/i)
      assert.match(error.message, /kokoro/i)
      return true
    }
  )
  assert.ok(commands.includes('/fixture/venv/bin/python'))
})

test('doctor treats configured BGM and reference voice as required files', async () => {
  const withMedia = {
    ...config,
    bgm: { path: '/fixture/music.mp3' },
    tts: { engine: 'chatterbox', reference: '/fixture/voice.mp3' }
  }
  await assert.rejects(
    doctor(withMedia, {
      ...ready,
      pathExists: async (path) => path !== '/fixture/voice.mp3',
      ttsAvailable: async () => ({ packages: true, models: true })
    }),
    (error) => error.exitCode === 3 && /voice reference/.test(error.message)
  )
})

test('browser readiness probes the configured headful mode and channel', async () => {
  let launchOptions
  const closed = []
  const result = await probeBrowser(
    { browser: { channel: 'chrome', headless: false } },
    {
      loadPlaywright: async () => ({
        chromium: {
          launch: async (options) => {
            launchOptions = options
            return { close: async () => closed.push(true) }
          }
        }
      })
    }
  )

  assert.equal(result, true)
  assert.deepEqual(launchOptions, { channel: 'chrome', headless: false })
  assert.equal(closed.length, 1)
})

test('Chatterbox readiness requires the selected model in the local Hugging Face cache', async () => {
  const calls = []
  const result = await probeTts(
    { tts: { engine: 'chatterbox' } },
    {
      environment: { CHATTERBOX_HOME: '/fixture/chatterbox', CHATTERBOX_VARIANT: 'nano' },
      runProcess: async (file, args, options) => {
        calls.push({ args, file, options })
        return { code: calls.length === 1 ? 0 : 1, stderr: '', stdout: '' }
      }
    }
  )

  assert.deepEqual(result, { packages: true, models: false })
  assert.equal(calls[0].file, '/fixture/chatterbox/.venv/bin/python')
  assert.match(calls[1].args.join(' '), /local_files_only=True/)
  assert.equal(calls[1].args.at(-1), 'nano')
  assert.equal(calls[1].options.env.HF_HUB_OFFLINE, '1')
})
