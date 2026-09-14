#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'

const execute = promisify(execFile)
const binary = /\.(?:mp3|png)$/i
const forbiddenNames = [['la', 'yak'].join(''), ['code', 'nection'].join('')]
const scratchDirectory = ['.devin', '-fanout'].join('')
const machinePaths = [['/home', '/user/'].join(''), ['/Users', '/user/'].join('')]
const secretPatterns = [
  /ghp_[A-Za-z0-9]{36}/,
  /github_pat_[A-Za-z0-9_]{82}/,
  /sk-[A-Za-z0-9]{32,}/,
  /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/
]

const { stdout } = await execute('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  encoding: 'buffer',
  maxBuffer: 16 * 1024 * 1024
})
const paths = stdout.toString('utf8').split('\0').filter(Boolean)
const failures = []

if (paths.includes('README.md')) failures.push('README.md must live only at docs/README.md')
if (!paths.includes('docs/README.md')) failures.push('docs/README.md is missing')
if (paths.some((path) => /(^|\/)\.env(?:\.|$)/.test(path))) failures.push('an environment file is tracked')
if (paths.some((path) => /\.(?:mp4|webm|wav|srt|ass)$/i.test(path))) failures.push('generated media is tracked')
if (paths.some((path) => path.split('/').includes(scratchDirectory))) failures.push('worker scratch state is tracked')

for (const path of paths) {
  if (binary.test(path)) continue
  let contents
  try {
    contents = await readFile(path, 'utf8')
  } catch {
    continue
  }
  const lower = contents.toLowerCase()
  for (const name of forbiddenNames) {
    if (lower.includes(name)) failures.push(`${path}: contains a forbidden project reference`)
  }
  for (const prefix of machinePaths) {
    if (contents.includes(prefix)) failures.push(`${path}: contains a developer-specific absolute path`)
  }
  for (const pattern of secretPatterns) {
    if (pattern.test(contents)) failures.push(`${path}: resembles a credential or private key`)
  }
}

const agents = await readFile('AGENTS.md', 'utf8')
if (agents.split('\n').length > 200) failures.push('AGENTS.md exceeds 200 lines')

const history = await execute('git', ['log', '--all', '--format=%s%n%b'])
for (const name of forbiddenNames) {
  if (history.stdout.toLowerCase().includes(name)) failures.push('Git history contains a forbidden project reference')
}

if (failures.length) {
  for (const failure of [...new Set(failures)]) process.stderr.write(`${failure}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`Public-content check passed for ${paths.length} files.\n`)
}
