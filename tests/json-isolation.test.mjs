import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { runProcess } from '../src/process.mjs'

const executable = fileURLToPath(new URL('../bin/rakam.mjs', import.meta.url))

test('the executable isolates direct fd writes and inherited child stdout in JSON mode', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rakamlah-json-isolation-'))
  await writeFile(join(root, 'narration.txt'), 'ready | 0 | Ready.\n')
  await writeFile(
    join(root, 'scenario.mjs'),
    `import { spawnSync } from 'node:child_process'
spawnSync(process.execPath, ['-e', "process.stdout.write('child-inherit-noise\\n')"], { stdio: 'inherit' })
export const expectedBeats = ['ready']
export const walk = async () => {}
`
  )
  await writeFile(
    join(root, 'rakam.config.mjs'),
    `import { writeSync } from 'node:fs'
writeSync(1, 'config-fd-noise\\n')
export default { project: 'fixture', scenario: './scenario.mjs', narration: './narration.txt' }
`
  )

  const result = await runProcess(process.execPath, [
    executable,
    'validate',
    '--config',
    join(root, 'rakam.config.mjs'),
    '--json'
  ])

  assert.equal(result.code, 0)
  assert.equal(result.stdout.split('\n').filter(Boolean).length, 1)
  assert.deepEqual(JSON.parse(result.stdout), {
    ok: true,
    command: 'validate',
    message: 'Configuration and scenario are valid.',
    project: 'fixture',
    beats: ['ready'],
    hooks: ['walk']
  })
  assert.match(result.stderr, /config-fd-noise/)
  assert.match(result.stderr, /child-inherit-noise/)
})
