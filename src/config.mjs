import { pathToFileURL } from 'node:url'
import { dirname, isAbsolute, resolve } from 'node:path'

import { invalidInput } from './errors.mjs'

const object = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {})
const pathFrom = (root, value) => (value == null ? null : isAbsolute(value) ? value : resolve(root, value))
const positive = (value, label) => {
  if (!Number.isFinite(value) || value <= 0) throw invalidInput(`${label} must be a positive number`)
  return value
}

const requiredString = (input, key) => {
  if (typeof input[key] !== 'string' || input[key].trim() === '') throw invalidInput(`${key} is required`)
  return input[key]
}

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

  const input = object(imported.default)
  const root = dirname(absoluteConfigPath)
  const browser = object(input.browser)
  const viewport = object(browser.viewport)
  const video = object(input.video)
  const subtitles = object(input.subtitles)
  const tts = object(input.tts)
  const bgm = object(input.bgm)

  const minDuration = positive(video.minDuration ?? 60, 'video.minDuration')
  const maxDuration = positive(video.maxDuration ?? 120, 'video.maxDuration')
  if (minDuration > maxDuration) throw invalidInput('video duration bounds are inverted')

  const maxRows = subtitles.maxRows ?? 2
  if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 2) {
    throw invalidInput('subtitles.maxRows must be 1 or 2')
  }

  const config = {
    configPath: absoluteConfigPath,
    root,
    project: requiredString(input, 'project'),
    scenario: pathFrom(root, requiredString(input, 'scenario')),
    narration: pathFrom(root, requiredString(input, 'narration')),
    outputDir: pathFrom(root, input.outputDir ?? '.rakam/out'),
    browser: {
      viewport: {
        width: positive(viewport.width ?? 1440, 'browser.viewport.width'),
        height: positive(viewport.height ?? 900, 'browser.viewport.height')
      },
      channel: browser.channel ?? null,
      headless: browser.headless ?? true
    },
    video: {
      width: positive(video.width ?? 1920, 'video.width'),
      height: positive(video.height ?? 1080, 'video.height'),
      minDuration,
      maxDuration,
      preset: video.preset ?? 'slow'
    },
    subtitles: {
      font: subtitles.font ?? 'Quicksand',
      fontSize: positive(subtitles.fontSize ?? 18, 'subtitles.fontSize'),
      horizontalMargin: positive(subtitles.horizontalMargin ?? 80, 'subtitles.horizontalMargin'),
      verticalMargin: positive(subtitles.verticalMargin ?? 28, 'subtitles.verticalMargin'),
      maxRows
    },
    tts: {
      engine: tts.engine ?? 'kokoro',
      speed: positive(tts.speed ?? 1, 'tts.speed'),
      voice: tts.voice ?? 'af_heart',
      reference: pathFrom(root, tts.reference ?? null)
    },
    bgm: {
      path: pathFrom(root, bgm.path ?? null),
      gainDb: Number.isFinite(bgm.gainDb) ? bgm.gainDb : -17
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
