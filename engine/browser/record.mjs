import { mkdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { operationFailed } from '../../src/errors.mjs'
import { createBeatRecorder } from './beats.mjs'
import { linearScroll } from './motion.mjs'

const defaultRunId = () => `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 8)}`

const defaultLoadScenario = async (path) => import(`${pathToFileURL(path).href}?capture=${Date.now()}`)

const atomicJson = async (path, value) => {
  const temporary = `${path}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`)
  await rename(temporary, path)
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export const recordBrowser = async (
  config,
  {
    playwright: suppliedPlaywright,
    loadScenario = defaultLoadScenario,
    makeRunId = defaultRunId,
    clock,
    moveVideo = rename
  } = {}
) => {
  const playwright = suppliedPlaywright ?? (await import('playwright'))
  const scenario = await loadScenario(config.scenario)
  const runId = makeRunId()
  const runDir = join(config.outputDir, runId)
  await mkdir(runDir, { recursive: true })

  let browser
  let context
  let primaryError
  try {
    browser = await playwright.chromium.launch({
      headless: config.browser.headless,
      ...(config.browser.channel ? { channel: config.browser.channel } : {})
    })

    if (typeof scenario.warmup === 'function') await scenario.warmup({ browser, config })

    context = await browser.newContext({
      viewport: config.browser.viewport,
      recordVideo: { dir: runDir, size: config.browser.viewport }
    })
    const page = await context.newPage()
    const recorder = createBeatRecorder(scenario.expectedBeats, clock)
    const minimumBeatMs = scenario.minimumBeatMs ?? {}
    const markedAt = new Map()
    const mark = (beat) => {
      const event = recorder.mark(beat)
      markedAt.set(beat, Date.now())
      return event
    }
    const hold = async (beat) => {
      const minimum = Number(minimumBeatMs[beat] ?? 0)
      const elapsed = Date.now() - (markedAt.get(beat) ?? Date.now())
      if (minimum > elapsed) await delay(minimum - elapsed)
    }

    await scenario.walk({ browser, config, context, hold, linearScroll, mark, page, runDir, runId })
    const beats = recorder.audit()
    if (typeof scenario.audit === 'function') {
      const auditBeats = Object.freeze(beats.map((beat) => Object.freeze({ ...beat })))
      await scenario.audit({ beats: auditBeats, config, page, runDir, runId })
    }
    const video = page.video()
    await context.close()
    context = null
    const rawVideoPath = await video.path()
    const capturePath = join(runDir, 'capture.webm')
    await moveVideo(rawVideoPath, capturePath)
    const beatsPath = join(runDir, 'beats.json')
    await atomicJson(beatsPath, beats)

    return { beats, capturePath, runDir, runId }
  } catch (error) {
    primaryError = error
    throw error.exitCode ? error : operationFailed(`Capture failed: ${error.message}`, { runDir, runId })
  } finally {
    let finalizationError
    if (context) {
      try {
        await context.close()
      } catch (error) {
        if (!primaryError) finalizationError = error
      }
    }
    if (typeof scenario.cleanup === 'function') {
      try {
        await scenario.cleanup({ browser, config, runDir, runId })
      } catch (error) {
        if (!primaryError && !finalizationError) finalizationError = error
      }
    }
    if (browser) {
      try {
        await browser.close()
      } catch (error) {
        if (!primaryError && !finalizationError) finalizationError = error
      }
    }
    if (finalizationError) {
      throw operationFailed(`Capture cleanup failed: ${finalizationError.message}`, { runDir, runId })
    }
  }
}
