import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { narrate } from '../src/commands/narrate.mjs'

const fixture = async () => {
  const root = await mkdtemp(join(tmpdir(), 'rakamlah-narrate-'))
  const runDir = join(root, 'run-001')
  const { mkdir } = await import('node:fs/promises')
  await mkdir(runDir)
  const narration = join(root, 'narration.txt')
  const bgm = join(root, 'music.mp3')
  const reference = join(root, 'voice.mp3')
  await Promise.all([
    writeFile(join(runDir, 'capture.webm'), 'video'),
    writeFile(join(runDir, 'beats.json'), '[]'),
    writeFile(narration, 'landing | 0 | A clear introduction.\n'),
    writeFile(bgm, 'music'),
    writeFile(reference, 'voice')
  ])
  return { bgm, narration, reference, root, runDir }
}

test('narrate passes validated configuration through a strict environment boundary', async () => {
  const paths = await fixture()
  const calls = []
  const config = {
    root: paths.root,
    outputDir: paths.root,
    narration: paths.narration,
    video: { width: 1920, height: 1080, minDuration: 45, maxDuration: 90, preset: 'slow' },
    subtitles: { font: 'Quicksand', fontSize: 18, horizontalMargin: 80, verticalMargin: 28, maxRows: 2 },
    tts: { engine: 'chatterbox', voice: 'reference', speed: 1.05, reference: paths.reference },
    bgm: { path: paths.bgm, gainDb: -19 }
  }

  const result = await narrate(config, {
    runDir: paths.runDir,
    mediaDir: '/portable/media',
    runProcess: async (file, args, options) => {
      calls.push({ args, file, options })
      await writeFile(join(paths.runDir, 'demo.mp4'), 'finished')
      return { code: 0, stdout: 'done', stderr: '' }
    }
  })

  assert.equal(result.ok, true)
  assert.equal(result.runDir, paths.runDir)
  assert.equal(result.outputPath, join(paths.runDir, 'demo.mp4'))
  assert.deepEqual(calls[0].args, ['/portable/media/narrate.sh'])
  assert.equal(calls[0].file, 'bash')
  assert.equal(calls[0].options.env.RAKAM_DIR, paths.runDir)
  assert.equal(calls[0].options.env.RAKAM_SCRIPT, paths.narration)
  assert.equal(calls[0].options.env.RAKAM_TTS, 'chatterbox')
  assert.equal(calls[0].options.env.CHATTERBOX_REF, paths.reference)
  assert.equal(calls[0].options.env.RAKAM_BGM, paths.bgm)
  assert.equal(calls[0].options.env.RAKAM_SUBTITLE_MAX_ROWS, '2')
  assert.equal(calls[0].options.env.RAKAM_VIDEO_WIDTH, '1920')
})

test('narrate turns a media-process failure into exit code four', async () => {
  const paths = await fixture()
  const config = {
    root: paths.root,
    outputDir: paths.root,
    narration: paths.narration,
    video: { width: 1920, height: 1080, minDuration: 1, maxDuration: 90, preset: 'medium' },
    subtitles: { font: 'Quicksand', fontSize: 18, horizontalMargin: 80, verticalMargin: 28, maxRows: 2 },
    tts: { engine: 'kokoro', voice: 'af_heart', speed: 1, reference: null },
    bgm: { path: null, gainDb: -17 }
  }

  await assert.rejects(
    narrate(config, {
      runDir: paths.runDir,
      mediaDir: '/portable/media',
      runProcess: async () => ({ code: 1, stdout: '', stderr: 'speech crossed a visual boundary' })
    }),
    (error) => error.exitCode === 4 && /visual boundary/.test(error.message)
  )
})
