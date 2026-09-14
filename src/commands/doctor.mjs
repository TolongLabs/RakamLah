import { access } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { missingDependency } from '../errors.mjs'
import { commandExists as defaultCommandExists, runProcess as defaultRunProcess } from '../process.mjs'

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

const defaultLoadPlaywright = () => import('playwright')

export const probeBrowser = async (config, { loadPlaywright = defaultLoadPlaywright } = {}) => {
  let browser
  try {
    const { chromium } = await loadPlaywright()
    browser = await chromium.launch({
      headless: config.browser?.headless ?? true,
      ...(config.browser?.channel ? { channel: config.browser.channel } : {})
    })
    return true
  } catch {
    return false
  } finally {
    await browser?.close().catch(() => {})
  }
}

const defaultFfmpegCapabilities = async (ffmpeg, { runProcess = defaultRunProcess } = {}) => {
  try {
    const [encoders, filters] = await Promise.all([
      runProcess(ffmpeg, ['-hide_banner', '-encoders']),
      runProcess(ffmpeg, ['-hide_banner', '-filters'])
    ])
    const encoderText = `${encoders.stdout}\n${encoders.stderr}`
    const filterText = `${filters.stdout}\n${filters.stderr}`
    return {
      libx264: encoders.code === 0 && /\blibx264\b/.test(encoderText),
      subtitles: filters.code === 0 && /^\s*\S{2}\s+subtitles\s/m.test(filterText)
    }
  } catch {
    return { libx264: false, subtitles: false }
  }
}

const CHATTERBOX_CACHE_PROBE = `
import sys
from pathlib import Path
from huggingface_hub import hf_hub_download, snapshot_download

variant = sys.argv[1]
if variant == 'base':
    for filename in ['ve.safetensors', 't3_cfg.safetensors', 's3gen.safetensors', 'tokenizer.json', 'conds.pt']:
        hf_hub_download(repo_id='ResembleAI/chatterbox', filename=filename, local_files_only=True)
elif variant in {'nano', 'turbo'}:
    repo = 'ResembleAI/chatterbox-nano' if variant == 'nano' else 'ResembleAI/chatterbox-turbo'
    root = Path(snapshot_download(
        repo_id=repo,
        allow_patterns=['*.safetensors', '*.json', '*.txt', '*.pt', '*.model'],
        local_files_only=True,
    ))
    checkpoint = 't3_nano_v1.safetensors' if variant == 'nano' else 't3_turbo_v1.safetensors'
    for filename in [checkpoint, 's3gen_meanflow.safetensors']:
        path = root / filename
        if not path.is_file() or path.stat().st_size == 0:
            raise FileNotFoundError(path)
    from transformers import AutoTokenizer
    AutoTokenizer.from_pretrained(root, local_files_only=True)
else:
    raise ValueError(f'unsupported CHATTERBOX_VARIANT={variant!r}')
`

export const probeTts = async (
  config,
  { environment = process.env, pathExists = defaultPathExists, runProcess = defaultRunProcess, python = 'python3' } = {}
) => {
  const dataHome = environment.RAKAM_DATA_HOME || join(homedir(), '.local', 'share', 'rakamlah')
  if (config.tts.engine === 'chatterbox') {
    const chatterboxHome = environment.CHATTERBOX_HOME || join(dataHome, 'chatterbox')
    const chatterboxPython = join(chatterboxHome, '.venv', 'bin', 'python')
    const variant = environment.CHATTERBOX_VARIANT || 'nano'
    let packages = false
    try {
      const result = await runProcess(chatterboxPython, [
        '-c',
        'import chatterbox.tts, chatterbox.tts_turbo, torch, torchaudio'
      ])
      packages = result.code === 0
    } catch {
      packages = false
    }
    if (!packages) return { models: false, packages }
    let models = false
    try {
      const result = await runProcess(chatterboxPython, ['-c', CHATTERBOX_CACHE_PROBE, variant], {
        env: {
          ...environment,
          HF_HUB_DISABLE_TELEMETRY: '1',
          HF_HUB_OFFLINE: '1',
          TRANSFORMERS_OFFLINE: '1'
        }
      })
      models = result.code === 0
    } catch {
      models = false
    }
    return { models, packages }
  }

  let packages = false
  try {
    const result = await runProcess(python, ['-c', 'import kokoro_onnx, numpy, soundfile'])
    packages = result.code === 0
  } catch {
    packages = false
  }
  const kokoroHome = environment.KOKORO_HOME || join(dataHome, 'kokoro')
  const models = await Promise.all([
    pathExists(join(kokoroHome, 'kokoro-v1.0.onnx')),
    pathExists(join(kokoroHome, 'voices-v1.0.bin'))
  ])
  return { packages, models: models.every(Boolean) }
}

const addCheck = async (checks, name, probe, label = name) => {
  let ok = false
  try {
    ok = Boolean(await probe())
  } catch {
    ok = false
  }
  checks.push({ name, ok, required: true, label })
}

export const doctor = async (
  config,
  {
    browserAvailable = probeBrowser,
    commandExists = defaultCommandExists,
    environment = process.env,
    ffmpegCapabilities = defaultFfmpegCapabilities,
    pathExists = defaultPathExists,
    playwrightAvailable = defaultPlaywrightAvailable,
    runProcess = defaultRunProcess,
    ttsAvailable = probeTts,
    nodeVersion = process.versions.node
  } = {}
) => {
  const checks = []
  const python = environment.RAKAM_PYTHON || 'python3'
  const ffmpeg = environment.RAKAM_FFMPEG || 'ffmpeg'
  const ffprobe = environment.RAKAM_FFPROBE || 'ffprobe'
  const major = Number.parseInt(nodeVersion.split('.')[0], 10)

  await addCheck(checks, 'node', async () => Number.isFinite(major) && major >= 20, 'Node.js 20 or newer')
  await addCheck(checks, 'bash', () => commandExists('bash'))
  await addCheck(checks, 'python', () => commandExists(python), `Python interpreter (${python})`)
  await addCheck(checks, 'ffmpeg', () => commandExists(ffmpeg), `FFmpeg executable (${ffmpeg})`)
  await addCheck(checks, 'ffprobe', () => commandExists(ffprobe), `FFprobe executable (${ffprobe})`)
  await addCheck(checks, 'playwright', playwrightAvailable, 'Playwright package')
  await addCheck(checks, 'chromium', () => browserAvailable(config), 'configured Chromium browser')

  const capabilities = await ffmpegCapabilities(ffmpeg, { runProcess })
  await addCheck(checks, 'ffmpeg-libx264', async () => capabilities.libx264, 'FFmpeg libx264 encoder')
  await addCheck(checks, 'ffmpeg-subtitles', async () => capabilities.subtitles, 'FFmpeg subtitles filter')

  await addCheck(checks, 'scenario', () => pathExists(config.scenario), 'scenario file')
  await addCheck(checks, 'narration', () => pathExists(config.narration), 'narration file')
  if (config.bgm?.path) await addCheck(checks, 'bgm', () => pathExists(config.bgm.path), 'BGM file')
  if (config.tts?.reference) {
    await addCheck(checks, 'voice-reference', () => pathExists(config.tts.reference), 'voice reference')
  }

  const tts = await ttsAvailable(config, { environment, pathExists, python, runProcess })
  const engine = config.tts.engine
  await addCheck(checks, `${engine}-packages`, async () => tts.packages, `${engine} Python packages`)
  const modelLabel =
    engine === 'kokoro' ? 'Kokoro model files' : `Chatterbox ${environment.CHATTERBOX_VARIANT || 'nano'} model cache`
  await addCheck(checks, `${engine}-models`, async () => tts.models, modelLabel)

  const missing = checks.filter((item) => item.required && !item.ok)
  if (missing.length) {
    throw missingDependency(`Missing required dependencies: ${missing.map((item) => item.label).join(', ')}`, {
      checks
    })
  }

  return {
    ok: true,
    command: 'doctor',
    message: 'Static dependencies and the configured browser are ready.',
    checks
  }
}
