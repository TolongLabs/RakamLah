import { pathToFileURL } from 'node:url'

import { invalidInput } from '../errors.mjs'

export const validate = async (config) => {
  let scenario
  try {
    scenario = await import(`${pathToFileURL(config.scenario).href}?validated=${Date.now()}`)
  } catch (error) {
    throw invalidInput(`Cannot load scenario: ${config.scenario}`, { cause: error.message })
  }

  if (typeof scenario.walk !== 'function') throw invalidInput('Scenario must export a walk function')
  if (
    !Array.isArray(scenario.expectedBeats) ||
    scenario.expectedBeats.length === 0 ||
    scenario.expectedBeats.some((beat) => typeof beat !== 'string' || beat.trim() === '') ||
    new Set(scenario.expectedBeats).size !== scenario.expectedBeats.length
  ) {
    throw invalidInput('Scenario expectedBeats must be a non-empty array of unique strings')
  }
  for (const hook of ['warmup', 'audit']) {
    if (hook in scenario && typeof scenario[hook] !== 'function') throw invalidInput(`Scenario ${hook} must be a function`)
  }

  return {
    ok: true,
    command: 'validate',
    message: 'Configuration and scenario are valid.',
    project: config.project,
    beats: [...scenario.expectedBeats],
    hooks: ['warmup', 'walk', 'audit'].filter((hook) => typeof scenario[hook] === 'function')
  }
}
