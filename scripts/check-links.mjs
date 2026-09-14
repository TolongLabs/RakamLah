#!/usr/bin/env node
import { access, readdir, readFile } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'

const collectMarkdown = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries
      .filter((entry) => entry.name !== '.git' && entry.name !== 'node_modules' && entry.name !== '.agents')
      .map(async (entry) => {
        const path = resolve(directory, entry.name)
        if (entry.isDirectory()) return collectMarkdown(path)
        return extname(entry.name) === '.md' ? [path] : []
      })
  )
  return nested.flat()
}

const exists = async (path) => {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const files = await collectMarkdown(resolve('.'))
const failures = []
for (const file of files) {
  const contents = await readFile(file, 'utf8')
  for (const match of contents.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    let target = match[1].trim().replace(/^<|>$/g, '')
    if (!target || /^(?:https?:|mailto:|#)/.test(target)) continue
    target = target.split('#')[0]
    if (!target) continue
    const resolved = resolve(dirname(file), decodeURIComponent(target))
    if (!(await exists(resolved))) failures.push(`${file}: broken link to ${target}`)
  }
}

if (failures.length) {
  for (const failure of failures) process.stderr.write(`${failure}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`Relative-link check passed for ${files.length} Markdown files.\n`)
}
