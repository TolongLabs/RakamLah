import { access } from 'node:fs/promises'

import { missingDependency } from '../errors.mjs'
import { commandExists as defaultCommandExists } from '../process.mjs'

const defaultPathExists = async (path) => {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const defaultPlaywrightAvailable = async () => {
  try {
    await import('playwright')
    return true
  } catch {
    return false
  }
}

const check = async (checks, name, probe, required = true, label = name) => {
  const ok = await probe()
  checks.push({ name, ok, required })
  if (!ok && required) throw missingDependency(`${label} is not available`, { checks })
}

export const doctor = async (
  config,
  {
    commandExists = defaultCommandExists,
    pathExists = defaultPathExists,
    playwrightAvailable = defaultPlaywrightAvailable,
    nodeVersion = process.versions.node
  } = {}
) => {
  const checks = []
  const major = Number.parseInt(nodeVersion.split('.')[0], 10)
  await check(checks, 'node', async () => Number.isFinite(major) && major >= 20, true, 'Node.js 20 or newer')
  for (const command of ['python3', 'ffmpeg', 'ffprobe']) {
    await check(checks, command, () => commandExists(command))
  }
  await check(checks, 'playwright', playwrightAvailable)
  await check(checks, 'scenario', () => pathExists(config.scenario), true, 'scenario file')
  await check(checks, 'narration', () => pathExists(config.narration), true, 'narration file')
  if (config.bgm?.path) await check(checks, 'bgm', () => pathExists(config.bgm.path), true, 'BGM file')
  if (config.tts?.reference) {
    await check(checks, 'voice-reference', () => pathExists(config.tts.reference), true, 'voice reference')
  }

  return {
    ok: true,
    command: 'doctor',
    message: 'All required tools are available.',
    checks
  }
}
