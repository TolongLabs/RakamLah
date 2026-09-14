# Porting RakamLah Into an Application

RakamLah integrates at the repository edge. The application does not need to import its runtime, change frameworks, or
expose a special API. Start with one configuration, one adapter, and one narration file.

## 1. Copy the templates

```bash
cp /path/to/RakamLah/templates/rakam.config.mjs ./rakam.config.mjs
cp /path/to/RakamLah/templates/scenario.mjs ./scenario.mjs
cp /path/to/RakamLah/templates/narration.txt ./narration.txt
```

Alternatively, keep those files in a `recording/` directory and point `--config` there. Paths resolve from the config,
not the caller's current directory.

## 2. Define the user outcome first

Write the final proof a viewer must see: a saved document, completed checkout, generated report, sent message, or other
visible result. Work backward into five to eight named beats. Avoid a beat for every click; a beat is a moment worth
narrating and holding on screen.

```js
export const expectedBeats = ['overview', 'input', 'processing', 'result', 'proof']
```

## 3. Implement the real user path

Use Playwright's user-facing locators and wait for visible state rather than sleeping blindly:

```js
export const walk = async ({ page, mark, hold, linearScroll }) => {
  await page.goto(process.env.RECORDING_URL, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Workspace' }).waitFor()
  mark('overview')
  await hold('overview')

  await page.getByLabel('Title').fill('Quarterly direction')
  mark('input')
  await hold('input')

  await page.getByRole('button', { name: 'Generate' }).click()
  await page.getByText('Working').waitFor()
  mark('processing')
  await hold('processing')

  const result = page.getByRole('heading', { name: 'Direction ready' })
  await result.waitFor()
  mark('result')
  await hold('result')

  await linearScroll(page, page.getByTestId('proof'), { duration: 1200 })
  mark('proof')
  await hold('proof')
}
```

The recording should follow a path a user would recognize. Narrate the element currently visible, not the next or
previous section.

## 4. Absorb cold starts before recording

If a service sleeps or first-load compilation is slow, use `warmup` to exercise it before the recording context exists:

```js
export const warmup = async ({ browser }) => {
  const page = await browser.newPage()
  try {
    await page.goto(process.env.RECORDING_URL, { waitUntil: 'networkidle', timeout: 90_000 })
    await page.getByRole('heading', { name: 'Workspace' }).waitFor()
  } finally {
    await page.close()
  }
}
```

Warm-up should verify readiness, not change the state that the filmed path expects. Keep bounded retries in the adapter
when the deployment genuinely needs them.

## 5. Prove the result

An `audit` hook can verify final DOM state after the walkthrough and before acceptance:

```js
export const audit = async ({ page, beats }) => {
  await page.getByText('Saved successfully').waitFor()
  if (beats.length !== expectedBeats.length) throw new Error('the walkthrough ended early')
}
```

For local servers or disposable fixtures, export `cleanup` and close them there. RakamLah invokes it after both success
and failure.

## 6. Write beat-keyed narration

Keep lines short enough to finish before the next visual beat. At a normal local voice speed, begin with roughly eight
to twelve spoken words per beat, then measure:

```text
overview | 150 | Begin with the workspace and one clear task.
input | 150 | Add the details using the same controls as any user.
processing | 100 | Progress remains visible while the result is prepared.
result | 150 | The completed direction appears in its working context.
proof | 150 | The flow ends on a result the viewer can verify.
```

Use `minimumBeatMs` to reserve screen time. If scheduling reports a visual overrun, shorten that line or increase the
matching hold—never disable the guard.

## 7. Verify in layers

```bash
node /path/to/RakamLah/bin/rakam.mjs doctor --config ./rakam.config.mjs --json
node /path/to/RakamLah/bin/rakam.mjs validate --config ./rakam.config.mjs --json
node /path/to/RakamLah/bin/rakam.mjs capture --config ./rakam.config.mjs --json
node /path/to/RakamLah/bin/rakam.mjs narrate --config ./rakam.config.mjs --json
node /path/to/RakamLah/bin/rakam.mjs verify --config ./rakam.config.mjs --json
```

Watch the raw capture once for selector timing, cursor focus, overlays, and scroll pacing. Watch the final cut once for
sentence-to-screen alignment, subtitle safe areas, dub intelligibility, and BGM balance. Automated checks catch contract
violations; editorial clarity still deserves human review.
