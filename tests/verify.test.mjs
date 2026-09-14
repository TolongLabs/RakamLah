import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { verify } from '../src/commands/verify.mjs'

const makeRun = async (beats = ['landing', 'result', 'finish']) => {
  const root = await mkdtemp(join(tmpdir(), 'rakamlah-verify-'))
  const runDir = join(root, 'run-001')
  await mkdir(runDir)
  await writeFile(join(runDir, 'demo.mp4'), 'media')
  await writeFile(
    join(runDir, 'beats.json'),
    JSON.stringify(beats.map((beat, index) => ({ beat, atMs: index * 1000 })))
  )
  return { root, runDir }
}

const probe = (overrides = {}) => ({
  format: { duration: '72.25' },
  streams: [
    { codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080 },
    { codec_type: 'audio', codec_name: 'aac', sample_rate: '44100', channels: 2 }
  ],
  ...overrides
})

const configFor = (root) => ({
  outputDir: root,
  scenario: join(root, 'scenario.mjs'),
  video: { width: 1920, height: 1080, minDuration: 60, maxDuration: 120 }
})

test('verify accepts a bounded H.264/AAC deliverable with all required beats', async () => {
  const paths = await makeRun()
  const result = await verify(configFor(paths.root), {
    runDir: paths.runDir,
    loadScenario: async () => ({ expectedBeats: ['landing', 'result', 'finish'] }),
    runProcess: async () => ({ code: 0, stdout: JSON.stringify(probe()), stderr: '' })
  })

  assert.equal(result.ok, true)
  assert.equal(result.duration, 72.25)
  assert.deepEqual(result.video, { codec: 'h264', width: 1920, height: 1080 })
  assert.deepEqual(result.audio, { codec: 'aac', channels: 2, sampleRate: 44100 })
})

test('verify rejects duration, codec, dimensions, audio, and missing beats', async (context) => {
  const cases = [
    ['duration', probe({ format: { duration: '30' } })],
    [
      'H.264',
      probe({
        streams: [
          { codec_type: 'video', codec_name: 'vp9', width: 1920, height: 1080 },
          { codec_type: 'audio', codec_name: 'aac' }
        ]
      })
    ],
    [
      'dimensions',
      probe({
        streams: [
          { codec_type: 'video', codec_name: 'h264', width: 1280, height: 720 },
          { codec_type: 'audio', codec_name: 'aac' }
        ]
      })
    ],
    [
      'AAC',
      probe({
        streams: [
          { codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080 },
          { codec_type: 'audio', codec_name: 'opus' }
        ]
      })
    ],
    ['audio', probe({ streams: [{ codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080 }] })]
  ]

  for (const [label, metadata] of cases) {
    await context.test(label, async () => {
      const paths = await makeRun()
      await assert.rejects(
        verify(configFor(paths.root), {
          runDir: paths.runDir,
          loadScenario: async () => ({ expectedBeats: ['landing', 'result', 'finish'] }),
          runProcess: async () => ({ code: 0, stdout: JSON.stringify(metadata), stderr: '' })
        }),
        (error) => error.exitCode === 5
      )
    })
  }

  await context.test('beats', async () => {
    const paths = await makeRun(['landing', 'finish'])
    await assert.rejects(
      verify(configFor(paths.root), {
        runDir: paths.runDir,
        loadScenario: async () => ({ expectedBeats: ['landing', 'result', 'finish'] }),
        runProcess: async () => ({ code: 0, stdout: JSON.stringify(probe()), stderr: '' })
      }),
      (error) => error.exitCode === 5 && /result/.test(error.message)
    )
  })
})
