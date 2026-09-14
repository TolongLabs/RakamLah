import { access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { operationFailed } from '../errors.mjs'
import { runProcess } from '../process.mjs'
import { findLatestRun } from '../runs.mjs'

const defaultMediaDir = fileURLToPath(new URL('../../engine/media/', import.meta.url))

const requireFile = async (path, label) => {
  try {
    await access(path)
  } catch {
    throw operationFailed(`Missing ${label}: ${path}`)
  }
}

export const narrate = async (config, dependencies = {}) => {
  const runDir =
    dependencies.runDir ?? (await (dependencies.findLatestRun ?? findLatestRun)(config.outputDir, 'capture.webm'))
  if (!runDir) throw operationFailed(`No captured run found in ${config.outputDir}.`)

  const capturePath = join(runDir, 'capture.webm')
  const beatsPath = join(runDir, 'beats.json')
  await Promise.all([
    requireFile(capturePath, 'capture'),
    requireFile(beatsPath, 'beat manifest'),
    requireFile(config.narration, 'narration script'),
    ...(config.bgm.path ? [requireFile(config.bgm.path, 'BGM')] : []),
    ...(config.tts.reference ? [requireFile(config.tts.reference, 'reference voice')] : [])
  ])

  const mediaDir = dependencies.mediaDir ?? defaultMediaDir
  const outputPath = join(runDir, 'demo.mp4')
  const execute = dependencies.runProcess ?? runProcess
  const env = {
    ...process.env,
    RAKAM_DIR: runDir,
    RAKAM_SOURCE: capturePath,
    RAKAM_SCRIPT: config.narration,
    RAKAM_OUT: outputPath,
    RAKAM_TTS: config.tts.engine,
    RAKAM_VOICE: config.tts.voice,
    RAKAM_SPEED: String(config.tts.speed),
    RAKAM_BGM: config.bgm.path ?? '',
    RAKAM_BGM_GAIN_DB: String(config.bgm.gainDb),
    RAKAM_MIN_DURATION: String(config.video.minDuration),
    RAKAM_MAX_DURATION: String(config.video.maxDuration),
    RAKAM_VIDEO_WIDTH: String(config.video.width),
    RAKAM_VIDEO_HEIGHT: String(config.video.height),
    RAKAM_PRESET: config.video.preset,
    RAKAM_SUBTITLE_FONT: config.subtitles.font,
    RAKAM_SUBTITLE_FONT_SIZE: String(config.subtitles.fontSize),
    RAKAM_SUBTITLE_MARGIN_H: String(config.subtitles.horizontalMargin),
    RAKAM_SUBTITLE_MARGIN_V: String(config.subtitles.verticalMargin),
    RAKAM_SUBTITLE_MAX_ROWS: String(config.subtitles.maxRows),
    ...(config.tts.reference ? { CHATTERBOX_REF: config.tts.reference } : {})
  }

  const result = await execute('bash', [join(mediaDir, 'narrate.sh')], {
    cwd: dirname(config.configPath ?? config.narration),
    env
  })
  if (result.code !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `process exited ${result.code}`
    throw operationFailed(`Narration failed: ${detail}`)
  }
  await requireFile(outputPath, 'rendered video')

  return {
    ok: true,
    command: 'narrate',
    message: `Narration completed in ${outputPath}.`,
    runDir,
    outputPath,
    artifacts: [outputPath, join(runDir, 'narration.srt'), join(runDir, 'lines.json')]
  }
}
