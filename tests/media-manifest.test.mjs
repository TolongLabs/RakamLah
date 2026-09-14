import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'

import { verifyMediaManifest } from '../scripts/check-media.mjs'

test('the bundled media matches its public checksum manifest', async () => {
  const result = await verifyMediaManifest(resolve('.'))
  assert.equal(result.ok, true)
  assert.equal(result.files.length, 4)
  assert.equal(result.files.filter((file) => file.kind === 'voice-reference').length, 2)
  assert.equal(result.files.filter((file) => file.kind === 'bgm').length, 1)
  assert.equal(result.authorization.confirmedOn, '2026-09-14')
  assert.equal(
    result.files.every((file) => file.redistributionAuthorized === true),
    true
  )
  assert.equal(
    result.files
      .filter((file) => file.kind === 'voice-reference')
      .every((file) => file.voiceSynthesisAuthorized === true),
    true
  )
})

test('media verification detects a changed byte', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rakamlah-media-'))
  const manifest = JSON.parse(await readFile(resolve('media/manifest.json'), 'utf8'))
  const entry = manifest.files.find((file) => file.kind === 'cue-sheet')
  await mkdir(dirname(join(root, entry.path)), { recursive: true })
  await cp(resolve(entry.path), join(root, entry.path), { recursive: true })
  await cp(resolve(manifest.authorization.record), join(root, manifest.authorization.record))
  const changed = await readFile(join(root, entry.path))
  changed[0] = changed[0] ^ 1
  await writeFile(join(root, entry.path), changed)
  await writeFile(join(root, 'media/manifest.json'), JSON.stringify({ ...manifest, files: [entry] }))

  await assert.rejects(verifyMediaManifest(root), /checksum mismatch/)
})

test('media verification rejects paths outside the repository', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rakamlah-media-'))
  await mkdir(join(root, 'media'), { recursive: true })
  await writeFile(join(root, 'media/AUTHORIZATION.md'), 'fixture authorization')
  await writeFile(
    join(root, 'manifest.json'),
    JSON.stringify({
      schemaVersion: 2,
      authorization: {
        record: 'media/AUTHORIZATION.md',
        confirmedBy: 'TolongLabs maintainer',
        confirmedOn: '2026-09-14',
        redistributionAuthorized: true,
        commercialUseAuthorized: true,
        attributionRequired: false
      },
      files: [{ path: '../outside.mp3', bytes: 1, sha256: '0'.repeat(64) }]
    })
  )

  await assert.rejects(verifyMediaManifest(root, 'manifest.json'), /unsafe media path/)
})

test('media verification requires an auditable authorization record', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rakamlah-media-'))
  const manifest = JSON.parse(await readFile(resolve('media/manifest.json'), 'utf8'))
  const entry = manifest.files.find((file) => file.kind === 'cue-sheet')
  await mkdir(dirname(join(root, entry.path)), { recursive: true })
  await cp(resolve(entry.path), join(root, entry.path))
  await writeFile(join(root, 'media/manifest.json'), JSON.stringify({ schemaVersion: 2, files: [entry] }))

  await assert.rejects(verifyMediaManifest(root), /authorization/i)
})
