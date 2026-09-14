import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

export const findLatestRun = async (outputDir, artifact) => {
  let entries
  try {
    entries = await readdir(outputDir, { withFileTypes: true })
  } catch {
    return null
  }

  const candidates = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const runDir = join(outputDir, entry.name)
        try {
          const details = await stat(join(runDir, artifact))
          return { modified: details.mtimeMs, runDir }
        } catch {
          return null
        }
      })
  )

  return candidates.filter(Boolean).sort((left, right) => right.modified - left.modified)[0]?.runDir ?? null
}
