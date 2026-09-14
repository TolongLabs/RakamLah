import { recordBrowser } from '../../engine/browser/record.mjs'

export const capture = async (config, dependencies = {}) => {
  const result = await recordBrowser(config, dependencies)
  return {
    ok: true,
    command: 'capture',
    message: `Capture completed in ${result.runDir}.`,
    ...result,
    artifacts: [result.capturePath, `${result.runDir}/beats.json`]
  }
}
