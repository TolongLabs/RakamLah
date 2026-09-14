import { invalidInput } from './errors.mjs'

const COMMANDS = new Set(['doctor', 'validate', 'capture', 'narrate', 'run', 'verify'])

export const parseArgs = (argv) => {
  const parsed = {
    command: null,
    configPath: 'rakam.config.mjs',
    help: false,
    json: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--help' || token === '-h') {
      parsed.help = true
      continue
    }
    if (token === '--json') {
      parsed.json = true
      continue
    }
    if (token === '--config' || token === '-c') {
      const value = argv[index + 1]
      if (!value || value.startsWith('-')) throw invalidInput(`${token} requires a path`)
      parsed.configPath = value
      index += 1
      continue
    }
    if (token.startsWith('-')) throw invalidInput(`Unknown option: ${token}`)
    if (parsed.command) throw invalidInput(`Unexpected argument: ${token}`)
    if (!COMMANDS.has(token)) throw invalidInput(`Unknown command: ${token}`)
    parsed.command = token
  }

  if (!parsed.command && !parsed.help) throw invalidInput('A command is required')
  return parsed
}

export const commandNames = () => [...COMMANDS]
