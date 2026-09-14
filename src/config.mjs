import { pathToFileURL } from 'node:url'
import { dirname, isAbsolute, resolve } from 'node:path'

import { invalidInput } from './errors.mjs'

const section = (value, label) => {
  if (value === undefined) return {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw invalidInput(`${label} must be an object`)
  }
  return value
}

const nonEmptyString = (value, label, { nullable = false } = {}) => {
  if (nullable && value === null) return null
  if (typeof value !== 'string' || value.trim() === '') throw invalidInput(`${label} must be a non-empty string`)
  return value
}

const pathFrom = (root, value, label, { nullable = false } = {}) => {
  if (value === null && nullable) return null
  const path = nonEmptyString(value, label)
  return isAbsolute(path) ? path : resolve(root, path)
}

const positive = (value, label) => {
  if (!Number.isFinite(value) || value <= 0) throw invalidInput(`${label} must be a positive number`)
  return value
}

const positiveInteger = (value, label) => {
  if (!Number.isInteger(value) || value <= 0) throw invalidInput(`${label} must be a positive integer`)
  return value
}

const finite = (value, label) => {
  if (!Number.isFinite(value)) throw invalidInput(`${label} must be a finite number`)
  return value
}

const boolean = (value, label) => {
  if (typeof value !== 'boolean') throw invalidInput(`${label} must be true or false`)
  return value
}

const requiredString = (input, key) => {
  if (typeof input[key] !== 'string' || input[key].trim() === '') throw invalidInput(`${key} is required`)
  return input[key]
}

const X264_PRESETS = new Set([
  'ultrafast',
  'superfast',
  'veryfast',
  'faster',
  'fast',
  'medium',
  'slow',
  'slower',
  'veryslow'
])

const freeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const item of Object.values(value)) freeze(item)
  return Object.freeze(value)
}

export const loadConfig = async (configPath) => {
  const absoluteConfigPath = resolve(configPath)
  let imported
  try {
    imported = await import(`${pathToFileURL(absoluteConfigPath).href}?loaded=${Date.now()}`)
  } catch (error) {
    throw invalidInput(`Cannot load config: ${absoluteConfigPath}`, { cause: error.message })
  }

  const input = section(imported.default, 'config default export')
  const root = dirname(absoluteConfigPath)
  const browser = section(input.browser, 'browser')
  const viewport = section(browser.viewport, 'browser.viewport')
  const video = section(input.video, 'video')
  const subtitles = section(input.subtitles, 'subtitles')
  const tts = section(input.tts, 'tts')
  const bgm = section(input.bgm, 'bgm')

  const minDuration = positive(video.minDuration ?? 60, 'video.minDuration')
  const maxDuration = positive(video.maxDuration ?? 120, 'video.maxDuration')
  if (minDuration > maxDuration) throw invalidInput('video duration bounds are inverted')

  const maxRows = subtitles.maxRows ?? 2
  if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 2) {
    throw invalidInput('subtitles.maxRows must be 1 or 2')
  }

  const browserChannel =
    browser.channel === undefined ? null : nonEmptyString(browser.channel, 'browser.channel', { nullable: true })
  const browserHeadless = browser.headless === undefined ? true : boolean(browser.headless, 'browser.headless')
  const preset = video.preset === undefined ? 'slow' : nonEmptyString(video.preset, 'video.preset')
  if (!X264_PRESETS.has(preset)) throw invalidInput('video.preset must be a supported x264 preset')

  const ttsEngine = tts.engine === undefined ? 'kokoro' : nonEmptyString(tts.engine, 'tts.engine')
  const ttsVoice = tts.voice === undefined ? 'af_heart' : nonEmptyString(tts.voice, 'tts.voice')

  const config = {
    configPath: absoluteConfigPath,
    root,
    project: requiredString(input, 'project'),
    scenario: pathFrom(root, requiredString(input, 'scenario'), 'scenario'),
    narration: pathFrom(root, requiredString(input, 'narration'), 'narration'),
    outputDir: pathFrom(root, input.outputDir === undefined ? '.rakam/out' : input.outputDir, 'outputDir'),
    browser: {
      viewport: {
        width: positiveInteger(viewport.width ?? 1440, 'browser.viewport.width'),
        height: positiveInteger(viewport.height ?? 900, 'browser.viewport.height')
      },
      channel: browserChannel,
      headless: browserHeadless
    },
    video: {
      width: positiveInteger(video.width ?? 1920, 'video.width'),
      height: positiveInteger(video.height ?? 1080, 'video.height'),
      minDuration,
      maxDuration,
      preset
    },
    subtitles: {
      font: subtitles.font === undefined ? 'Quicksand' : nonEmptyString(subtitles.font, 'subtitles.font'),
      fontSize: positive(subtitles.fontSize ?? 18, 'subtitles.fontSize'),
      horizontalMargin: positive(subtitles.horizontalMargin ?? 80, 'subtitles.horizontalMargin'),
      verticalMargin: positive(subtitles.verticalMargin ?? 28, 'subtitles.verticalMargin'),
      maxRows
    },
    tts: {
      engine: ttsEngine,
      speed: positive(tts.speed ?? 1, 'tts.speed'),
      voice: ttsVoice,
      reference: pathFrom(root, tts.reference ?? null, 'tts.reference', { nullable: true })
    },
    bgm: {
      path: pathFrom(root, bgm.path ?? null, 'bgm.path', { nullable: true }),
      gainDb: bgm.gainDb === undefined ? -17 : finite(bgm.gainDb, 'bgm.gainDb')
    }
  }

  if (!['kokoro', 'chatterbox'].includes(config.tts.engine)) {
    throw invalidInput('tts.engine must be kokoro or chatterbox')
  }
  if (config.tts.engine === 'chatterbox' && !config.tts.reference) {
    throw invalidInput('tts.reference is required for chatterbox')
  }

  return freeze(config)
}
