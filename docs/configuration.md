# Configuration and Adapter Reference

RakamLah loads an ESM default export. Every relative path is resolved from the directory containing the configuration
file, so the same checkout works from any current working directory.

## Full configuration

```js
export default {
  project: 'my-walkthrough',
  scenario: './scenario.mjs',
  narration: './narration.txt',
  outputDir: './.rakam/out',
  browser: {
    viewport: { width: 1440, height: 900 },
    channel: null,
    headless: true
  },
  video: {
    width: 1920,
    height: 1080,
    minDuration: 60,
    maxDuration: 120,
    preset: 'slow'
  },
  subtitles: {
    font: 'Quicksand',
    fontSize: 18,
    horizontalMargin: 80,
    verticalMargin: 28,
    maxRows: 2
  },
  tts: {
    engine: 'kokoro',
    voice: 'af_heart',
    speed: 1,
    reference: null
  },
  bgm: {
    path: null,
    gainDb: -17
  }
}
```

## Fields

| Field                         | Default      | Contract                                                |
| ----------------------------- | ------------ | ------------------------------------------------------- |
| `project`                     | required     | Non-empty identifier returned in diagnostics            |
| `scenario`                    | required     | ESM scenario path                                       |
| `narration`                   | required     | Beat-keyed UTF-8 text file                              |
| `outputDir`                   | `.rakam/out` | Parent for unique run directories                       |
| `browser.viewport`            | `1440×900`   | Positive integer Playwright viewport and recording size |
| `browser.channel`             | `null`       | Null or a non-empty Playwright Chromium channel string  |
| `browser.headless`            | `true`       | Boolean launch mode                                     |
| `video.width`, `video.height` | `1920×1080`  | Positive integer final canvas dimensions                |
| `video.minDuration`           | `60`         | Minimum accepted seconds                                |
| `video.maxDuration`           | `120`        | Maximum accepted seconds; must not be below the minimum |
| `video.preset`                | `slow`       | One of FFmpeg's standard x264 presets                   |
| `subtitles.font`              | `Quicksand`  | Non-empty installed font name used by libass            |
| `subtitles.fontSize`          | `18`         | Positive ASS font size                                  |
| `subtitles.horizontalMargin`  | `80`         | Positive left/right safe margin                         |
| `subtitles.verticalMargin`    | `28`         | Positive bottom safe margin                             |
| `subtitles.maxRows`           | `2`          | One or two; no cue may exceed it                        |
| `tts.engine`                  | `kokoro`     | `kokoro` or `chatterbox`                                |
| `tts.voice`                   | `af_heart`   | Non-empty Kokoro voice identifier                       |
| `tts.speed`                   | `1`          | Positive synthesis speed                                |
| `tts.reference`               | `null`       | Required local audio path when using Chatterbox         |
| `bgm.path`                    | `null`       | Optional local audio path                               |
| `bgm.gainDb`                  | `-17`        | Finite numeric gain before side-chain ducking           |

Configuration objects are deeply frozen after loading. `validate` checks every documented field type, integer
dimensions, duration bounds, supported x264 presets and TTS engines, and adapter exports. Browser selectors and
narration-to-beat alignment are evaluated only when their corresponding stages run.

## Scenario adapter

Every scenario exports:

```js
export const expectedBeats = ['landing', 'input', 'outcome']
export const walk = async (context) => {}
```

`expectedBeats` must be a non-empty list of unique strings. `walk` receives:

| Value                                 | Meaning                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `browser`                             | Launched Playwright browser                                                |
| `context`                             | Recording browser context                                                  |
| `page`                                | Fresh page whose video becomes `capture.webm`                              |
| `config`                              | Frozen RakamLah configuration                                              |
| `runId`/`runDir`                      | Unique output identity and directory                                       |
| `mark(beat)`                          | Record the next expected beat; duplicates and wrong order fail immediately |
| `hold(beat)`                          | Wait until that beat's declared minimum screen time has elapsed            |
| `linearScroll(page, target, options)` | Move at constant speed to a locator or numeric Y position                  |

A scenario may export `minimumBeatMs`, an object mapping beat names to minimum milliseconds. It may also export these
async lifecycle hooks:

- `warmup({ browser, config })`: prepare a local fixture, authenticate, or absorb a cold start before recording begins.
- `audit({ beats, config, page, runDir, runId })`: assert that the final visible outcome is genuine.
- `cleanup({ browser, config, runDir, runId })`: release a fixture server or other scenario-owned resource after either
  success or failure.

Use role, label, placeholder, and test-id selectors that describe user intent. Use dedicated test accounts and
synthetic fixtures. Keep secrets in the consuming environment, never in config committed to Git.

## Narration format

Narration is one line per spoken segment:

```text
# beat | offset in milliseconds | spoken line
landing | 150 | Begin on the workspace overview.
input | 100 | Add the details exactly as a user would.
outcome | 200 | The completed result stays visible for review.
```

The beat must have been recorded. The integer offset is added to its timestamp. Lines are sorted by resolved time,
measured after synthesis, and shifted forward only to avoid voice overlap. A line that crosses the following visual beat
fails the render; shorten the copy or hold that screen longer.

## Environment values

Configuration is ordinary JavaScript, so environment-specific URLs or browser channels can be read directly:

```js
export default {
  project: 'production-tour',
  scenario: './scenario.mjs',
  narration: './narration.txt',
  browser: { channel: process.env.RAKAM_BROWSER_CHANNEL || null }
}
```

In v0.1, read application-specific values such as `RECORDING_URL` inside the scenario itself. The validated config
contains only the fields documented above.
