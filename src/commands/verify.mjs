import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { verificationFailed } from '../errors.mjs'
import { runProcess } from '../process.mjs'
import { findLatestRun } from '../runs.mjs'

const defaultLoadScenario = async (path) => import(`${pathToFileURL(path).href}?verify=${Date.now()}`)

export const verify = async (config, dependencies = {}) => {
  const runDir =
    dependencies.runDir ?? (await (dependencies.findLatestRun ?? findLatestRun)(config.outputDir, 'demo.mp4'))
  if (!runDir) throw verificationFailed(`No rendered run found in ${config.outputDir}.`)

  const outputPath = join(runDir, 'demo.mp4')
  const beatsPath = join(runDir, 'beats.json')
  try {
    await Promise.all([access(outputPath), access(beatsPath)])
  } catch {
    throw verificationFailed(`Run is missing demo.mp4 or beats.json: ${runDir}`)
  }

  const execute = dependencies.runProcess ?? runProcess
  const probe = await execute('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration:stream=codec_type,codec_name,width,height,sample_rate,channels',
    '-of',
    'json',
    outputPath
  ])
  if (probe.code !== 0) {
    throw verificationFailed(`ffprobe failed: ${probe.stderr.trim() || `exit ${probe.code}`}`)
  }

  let metadata
  let beats
  let scenario
  try {
    metadata = JSON.parse(probe.stdout)
    beats = JSON.parse(await readFile(beatsPath, 'utf8'))
    scenario = await (dependencies.loadScenario ?? defaultLoadScenario)(config.scenario)
  } catch (error) {
    throw verificationFailed(`Cannot read verification metadata: ${error.message}`)
  }

  const duration = Number(metadata?.format?.duration)
  const video = metadata?.streams?.find((stream) => stream.codec_type === 'video')
  const audio = metadata?.streams?.find((stream) => stream.codec_type === 'audio')
  const recordedBeats = new Set(
    Array.isArray(beats) ? beats.map((item) => item?.beat).filter((beat) => typeof beat === 'string') : []
  )
  const expectedBeats = Array.isArray(scenario?.expectedBeats) ? scenario.expectedBeats : []
  const missingBeats = expectedBeats.filter((beat) => !recordedBeats.has(beat))
  const failures = []

  if (!Number.isFinite(duration) || duration < config.video.minDuration || duration > config.video.maxDuration) {
    failures.push(`duration ${duration || 0}s is outside ${config.video.minDuration}-${config.video.maxDuration}s`)
  }
  if (!video) failures.push('video stream is missing')
  else {
    if (video.codec_name !== 'h264') failures.push(`video codec must be H.264, received ${video.codec_name}`)
    if (video.width !== config.video.width || video.height !== config.video.height) {
      failures.push(
        `video dimensions must be ${config.video.width}x${config.video.height}, received ${video.width}x${video.height}`
      )
    }
  }
  if (!audio) failures.push('audio stream is missing')
  else if (audio.codec_name !== 'aac') failures.push(`audio codec must be AAC, received ${audio.codec_name}`)
  if (missingBeats.length) failures.push(`missing required beats: ${missingBeats.join(', ')}`)
  if (failures.length) throw verificationFailed(`Verification failed: ${failures.join('; ')}`)

  return {
    ok: true,
    command: 'verify',
    message: `Verified ${outputPath}.`,
    runDir,
    outputPath,
    duration,
    video: { codec: video.codec_name, width: video.width, height: video.height },
    audio: {
      codec: audio.codec_name,
      channels: Number(audio.channels),
      sampleRate: Number(audio.sample_rate)
    },
    beats: [...recordedBeats]
  }
}
