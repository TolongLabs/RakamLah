import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { validate } from '../src/commands/validate.mjs'

const scenario = async (source) => {
  const root = await mkdtemp(join(tmpdir(), 'rakamlah-scenario-'))
  const path = join(root, 'scenario.mjs')
  await writeFile(path, source)
  return path
}

test('validate accepts a scenario with walk, expected beats, and optional lifecycle hooks', async () => {
  const path = await scenario(`
    export const expectedBeats = ['start', 'finish']
    export const warmup = async () => {}
    export const walk = async () => {}
    export const audit = async () => {}
  `)
  const result = await validate({ project: 'fixture', scenario: path, narration: '/fixture/narration.txt' })

  assert.deepEqual(result, {
    ok: true,
    command: 'validate',
    message: 'Configuration and scenario are valid.',
    project: 'fixture',
    beats: ['start', 'finish'],
    hooks: ['warmup', 'walk', 'audit']
  })
})

test('validate rejects a missing walk export', async () => {
  const path = await scenario(`export const expectedBeats = ['start']`)
  await assert.rejects(validate({ project: 'fixture', scenario: path }), (error) => error.exitCode === 2 && /walk/.test(error.message))
})

test('validate rejects duplicate or absent expected beats', async () => {
  const duplicate = await scenario(`export const expectedBeats = ['start', 'start']; export const walk = async () => {}`)
  await assert.rejects(validate({ project: 'fixture', scenario: duplicate }), (error) => error.exitCode === 2 && /expectedBeats/.test(error.message))

  const absent = await scenario(`export const walk = async () => {}`)
  await assert.rejects(validate({ project: 'fixture', scenario: absent }), (error) => error.exitCode === 2 && /expectedBeats/.test(error.message))
})

test('validate rejects a non-function optional hook', async () => {
  const path = await scenario(`export const expectedBeats = ['start']; export const walk = async () => {}; export const audit = true`)
  await assert.rejects(validate({ project: 'fixture', scenario: path }), (error) => error.exitCode === 2 && /audit/.test(error.message))
})
