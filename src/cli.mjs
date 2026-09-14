import { parseArgs } from './args.mjs'
import { loadConfig } from './config.mjs'
import { doctor } from './commands/doctor.mjs'
import { validate } from './commands/validate.mjs'
import { writeResult } from './output.mjs'

const HELP = `RakamLah — portable browser walkthrough recording

Usage:
  rakam <command> [--config <path>] [--json]

Commands:
  doctor    Check local dependencies and configured files
  validate  Validate configuration and scenario exports
  capture   Record browser video and visual beat metadata
  narrate   Synthesize speech, subtitles, BGM, and final video
  run       Capture, narrate, and verify in one operation
  verify    Verify an existing deliverable

Options:
  -c, --config <path>  Configuration file (default: rakam.config.mjs)
  --json               Emit one machine-readable JSON object
  -h, --help           Show this help
`

const loaders = {
  capture: () => import('./commands/capture.mjs').then((module) => module.capture),
  narrate: () => import('./commands/narrate.mjs').then((module) => module.narrate),
  run: () => import('./commands/run.mjs').then((module) => module.run),
  verify: () => import('./commands/verify.mjs').then((module) => module.verify)
}

const requestedCommand = (argv) => argv.find((token) => !token.startsWith('-')) ?? null

export const main = async (argv, io = {}, dependencies = {}) => {
  const stdout = io.stdout ?? process.stdout
  const stderr = io.stderr ?? process.stderr
  const wantsJson = argv.includes('--json')
  let command = requestedCommand(argv)

  try {
    const parsed = parseArgs(argv)
    command = parsed.command
    if (parsed.help) {
      if (parsed.json) writeResult({ ok: true, command: 'help', help: HELP }, { json: true, stdout, stderr })
      else stdout.write(HELP)
      return 0
    }

    const config = await (dependencies.loadConfig ?? loadConfig)(parsed.configPath)
    const configuredHandlers = dependencies.handlers ?? {}
    let handler = configuredHandlers[parsed.command]
    if (!handler) {
      if (parsed.command === 'doctor') handler = doctor
      else if (parsed.command === 'validate') handler = validate
      else handler = await loaders[parsed.command]()
    }
    const result = await handler(config, dependencies)
    writeResult(result, { json: parsed.json, stdout, stderr })
    return 0
  } catch (error) {
    const exitCode = Number.isInteger(error.exitCode) ? error.exitCode : 4
    const result = {
      ok: false,
      command,
      exitCode,
      message: error.message || 'RakamLah failed.'
    }
    writeResult(result, { json: wantsJson, stdout, stderr })
    return exitCode
  }
}

export const helpText = HELP
