import { capture as captureCommand } from './capture.mjs'
import { narrate as narrateCommand } from './narrate.mjs'
import { verify as verifyCommand } from './verify.mjs'

export const run = async (config, dependencies = {}) => {
  const capture = await (dependencies.capture ?? captureCommand)(config, dependencies)
  const scoped = { ...dependencies, runDir: capture.runDir }
  const narration = await (dependencies.narrate ?? narrateCommand)(config, scoped)
  const verification = await (dependencies.verify ?? verifyCommand)(config, scoped)

  return {
    ok: true,
    command: 'run',
    message: `Recorded and verified ${narration.outputPath}.`,
    runId: capture.runId,
    runDir: capture.runDir,
    outputPath: narration.outputPath,
    artifacts: narration.artifacts,
    verification
  }
}
