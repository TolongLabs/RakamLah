import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

import { loadConfig } from '../src/config.mjs'
import { validate } from '../src/commands/validate.mjs'

const root = resolve('examples/basic')

test('the neutral example is self-contained and satisfies the adapter contract', async () => {
  const config = await loadConfig(resolve(root, 'rakam.config.mjs'))
  const result = await validate(config)
  const scenario = await import(`${pathToFileURL(config.scenario).href}?example-test=${Date.now()}`)
  const narration = await readFile(config.narration, 'utf8')
  const html = await readFile(resolve(root, 'site/index.html'), 'utf8')
  const styles = await readFile(resolve(root, 'site/style.css'), 'utf8')
  const application = await readFile(resolve(root, 'site/app.js'), 'utf8')
  const narratedBeats = narration
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('|', 1)[0].trim())

  assert.equal(result.ok, true)
  assert.deepEqual(narratedBeats, scenario.expectedBeats)
  assert.equal(typeof scenario.warmup, 'function')
  assert.equal(typeof scenario.walk, 'function')
  assert.equal(typeof scenario.cleanup, 'function')
  assert.match(html, /<label[^>]*for="campaign"/)
  assert.match(html, /<label[^>]*for="audience"/)
  assert.match(html, /<button[^>]*id="generate"/)
  assert.match(html, /aria-live="polite"/)
  assert.match(styles, /prefers-reduced-motion/)
  assert.match(application, /result-panel/)
  assert.doesNotMatch(`${html}\n${styles}\n${application}\n${narration}`, /https?:\/\//)
})
