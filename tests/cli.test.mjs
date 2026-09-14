import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { main } from '../src/cli.mjs'

const sink = () => {
  let value = ''
  return { stream: { write: (chunk) => (value += chunk) }, value: () => value }
}

const fixture = async () => {
  const root = await mkdtemp(join(tmpdir(), 'rakamlah-cli-'))
  await writeFile(
    join(root, 'scenario.mjs'),
    `export const expectedBeats = ['ready']; export const walk = async () => {}`
  )
  await writeFile(join(root, 'narration.txt'), 'ready | 0 | Ready.\n')
  await writeFile(
    join(root, 'rakam.config.mjs'),
    `export default { project: 'fixture', scenario: './scenario.mjs', narration: './narration.txt' }`
  )
  return join(root, 'rakam.config.mjs')
}

test('main returns zero and one JSON object for a successful validation', async () => {
  const path = await fixture()
  const stdout = sink()
  const stderr = sink()

  const code = await main(['validate', '--config', path, '--json'], { stdout: stdout.stream, stderr: stderr.stream })

  assert.equal(code, 0)
  assert.equal(stderr.value(), '')
  assert.deepEqual(JSON.parse(stdout.value()), {
    ok: true,
    command: 'validate',
    message: 'Configuration and scenario are valid.',
    project: 'fixture',
    beats: ['ready'],
    hooks: ['walk']
  })
  assert.equal(stdout.value().split('\n').filter(Boolean).length, 1)
})

test('JSON mode redirects config and adapter stdout noise to stderr', async () => {
  const stdout = sink()
  const stderr = sink()
  const config = { project: 'fixture' }
  const code = await main(
    ['validate', '--json'],
    { stdout: stdout.stream, stderr: stderr.stream },
    {
      loadConfig: async () => {
        console.log('config-noise')
        return config
      },
      handlers: {
        validate: async () => {
          process.stdout.write('adapter-noise\n')
          return { ok: true, command: 'validate', message: 'valid' }
        }
      }
    }
  )

  assert.equal(code, 0)
  assert.deepEqual(JSON.parse(stdout.value()), {
    ok: true,
    command: 'validate',
    message: 'valid'
  })
  assert.equal(stdout.value().split('\n').filter(Boolean).length, 1)
  assert.match(stderr.value(), /config-noise/)
  assert.match(stderr.value(), /adapter-noise/)
})

test('main maps invalid input to exit code 2 in JSON mode', async () => {
  const stdout = sink()
  const stderr = sink()
  const code = await main(['film', '--json'], { stdout: stdout.stream, stderr: stderr.stream })

  assert.equal(code, 2)
  assert.equal(stderr.value(), '')
  assert.deepEqual(JSON.parse(stdout.value()), {
    ok: false,
    command: 'film',
    exitCode: 2,
    message: 'Unknown command: film'
  })
})

test('main renders help without loading a configuration', async () => {
  const stdout = sink()
  const stderr = sink()
  const code = await main(['--help'], { stdout: stdout.stream, stderr: stderr.stream })

  assert.equal(code, 0)
  assert.match(stdout.value(), /rakam <command>/)
  assert.match(stdout.value(), /doctor/)
  assert.equal(stderr.value(), '')
})

test('main maps a missing dependency to exit code 3', async () => {
  const path = await fixture()
  const stdout = sink()
  const stderr = sink()
  const handlers = {
    doctor: async () => {
      const error = new Error('ffmpeg is not available')
      error.exitCode = 3
      throw error
    }
  }

  const code = await main(
    ['doctor', '--config', path, '--json'],
    { stdout: stdout.stream, stderr: stderr.stream },
    { handlers }
  )
  assert.equal(code, 3)
  assert.equal(JSON.parse(stdout.value()).exitCode, 3)
})
