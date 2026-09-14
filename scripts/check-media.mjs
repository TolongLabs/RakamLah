#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const hashFile = (path) =>
  new Promise((resolveHash, reject) => {
    const hash = createHash('sha256')
    const input = createReadStream(path)
    input.on('error', reject)
    input.on('data', (chunk) => hash.update(chunk))
    input.on('end', () => resolveHash(hash.digest('hex')))
  })

const listFiles = async (directory) => {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directory, entry.name)
      return entry.isDirectory() ? listFiles(path) : [path]
    })
  )
  return nested.flat()
}

const assertSafePath = (root, value) => {
  if (typeof value !== 'string' || !value) throw new Error('media path must be a non-empty string')
  const absolute = resolve(root, value)
  if (!absolute.startsWith(`${root}${sep}`)) throw new Error(`unsafe media path: ${value}`)
  return absolute
}

const assertAuthorization = (manifest) => {
  const authorization = manifest.authorization
  if (!authorization || typeof authorization !== 'object' || Array.isArray(authorization)) {
    throw new Error('media manifest requires an authorization record')
  }
  if (
    typeof authorization.record !== 'string' ||
    typeof authorization.confirmedBy !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(authorization.confirmedOn) ||
    authorization.redistributionAuthorized !== true ||
    authorization.commercialUseAuthorized !== true ||
    authorization.attributionRequired !== false
  ) {
    throw new Error('media authorization record is incomplete')
  }
  return authorization
}

const assertEntryRights = (entry) => {
  for (const field of ['sourceCollection', 'rightsHolder', 'license', 'authorizationRecord']) {
    if (typeof entry[field] !== 'string' || !entry[field].trim()) {
      throw new Error(`${field} is required for ${entry.path}`)
    }
  }
  if (
    entry.redistributionAuthorized !== true ||
    entry.commercialUseAuthorized !== true ||
    entry.attributionRequired !== false
  ) {
    throw new Error(`rights scope is incomplete for ${entry.path}`)
  }
  if (entry.kind === 'voice-reference' && entry.voiceSynthesisAuthorized !== true) {
    throw new Error(`voice synthesis authorization is required for ${entry.path}`)
  }
}

export const verifyMediaManifest = async (repositoryRoot, manifestName = 'media/manifest.json') => {
  const root = resolve(repositoryRoot)
  const manifestPath = assertSafePath(root, manifestName)
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.schemaVersion !== 2 || !Array.isArray(manifest.files) || !manifest.files.length) {
    throw new Error('media manifest must use schemaVersion 2 and contain files')
  }
  const authorization = assertAuthorization(manifest)
  await stat(assertSafePath(root, authorization.record))

  const seen = new Set()
  const verified = []
  for (const entry of manifest.files) {
    const absolute = assertSafePath(root, entry.path)
    assertEntryRights(entry)
    if (seen.has(entry.path)) throw new Error(`duplicate media path: ${entry.path}`)
    seen.add(entry.path)
    if (!/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error(`invalid checksum: ${entry.path}`)
    const details = await stat(absolute)
    if (details.size !== entry.bytes) {
      throw new Error(`size mismatch for ${entry.path}: expected ${entry.bytes}, received ${details.size}`)
    }
    const checksum = await hashFile(absolute)
    if (checksum !== entry.sha256) {
      throw new Error(`checksum mismatch for ${entry.path}: expected ${entry.sha256}, received ${checksum}`)
    }
    verified.push({ ...entry })
  }

  const libraryFiles = (
    await Promise.all([listFiles(resolve(root, 'media/bgm')), listFiles(resolve(root, 'media/voices'))])
  )
    .flat()
    .map((path) => relative(root, path))
    .sort()
  const declared = [...seen].sort()
  if (JSON.stringify(libraryFiles) !== JSON.stringify(declared)) {
    const missing = libraryFiles.filter((path) => !seen.has(path))
    const absent = declared.filter((path) => !libraryFiles.includes(path))
    throw new Error(
      `media inventory mismatch; undeclared: ${missing.join(', ') || 'none'}; absent: ${absent.join(', ') || 'none'}`
    )
  }

  return { ok: true, authorization, files: verified }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const root = resolve(dirname(invokedPath), '..')
    const result = await verifyMediaManifest(root)
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } catch (error) {
    process.stderr.write(`Media verification failed: ${error.message}\n`)
    process.exitCode = 1
  }
}
