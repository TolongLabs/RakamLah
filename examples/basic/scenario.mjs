import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const siteRoot = join(dirname(fileURLToPath(import.meta.url)), 'site')
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
}

let server
let siteUrl

export const expectedBeats = ['overview', 'brief', 'generating', 'result', 'proof']

export const minimumBeatMs = {
  overview: 4500,
  brief: 4500,
  generating: 4200,
  result: 5000,
  proof: 4500
}

export const warmup = async () => {
  server = createServer(async (request, response) => {
    try {
      const requestPath = request.url === '/' ? 'index.html' : request.url.slice(1).split('?')[0]
      const safePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, '')
      const contents = await readFile(join(siteRoot, safePath))
      response.writeHead(200, { 'content-type': contentTypes[extname(safePath)] ?? 'application/octet-stream' })
      response.end(contents)
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('Not found')
    }
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  siteUrl = `http://127.0.0.1:${address.port}`
}

export const walk = async ({ hold, linearScroll, mark, page }) => {
  await page.goto(siteUrl, { waitUntil: 'networkidle' })
  mark('overview')
  await hold('overview')

  await page.getByLabel('Campaign name').fill('Autumn city launch')
  await page.getByLabel('Audience').fill('Independent teams building thoughtful products')
  await page.getByLabel('Primary format').selectOption('short-video')
  mark('brief')
  await hold('brief')

  await page.getByRole('button', { name: 'Shape the brief' }).click()
  await page.getByText('Reading the signal').waitFor()
  mark('generating')
  await hold('generating')

  await page.getByRole('heading', { name: 'A city-sized idea, made personal.' }).waitFor()
  mark('result')
  await hold('result')

  const proof = page.getByTestId('proof')
  await linearScroll(page, proof, { duration: 1200 })
  await page.getByRole('button', { name: 'Copy direction' }).click()
  await page.getByText('Direction copied').waitFor()
  mark('proof')
  await hold('proof')
}

export const audit = async ({ page }) => {
  await page.getByRole('heading', { name: 'A city-sized idea, made personal.' }).waitFor()
  await page.getByText('Direction copied').waitFor()
}

export const cleanup = async () => {
  if (!server) return
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  server = undefined
  siteUrl = undefined
}
