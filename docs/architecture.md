# Architecture

RakamLah is a local orchestrator with three deliberate boundaries: a Node command layer, a Playwright browser engine,
and a Python/FFmpeg media engine. A consuming application connects through configuration and one scenario adapter.

## Pipeline

```text
rakam.config.mjs
  ├─ scenario.mjs ──> validate ──> Playwright capture ──> capture.webm
  │                                           └────────> beats.json
  └─ narration.txt + beats.json ──> lines.json ──> local TTS segments
                                                   └─> schedule + subtitles
capture.webm + narration.wav + optional BGM ──────────> FFmpeg ──> demo.mp4
scenario expectedBeats + ffprobe metadata ───────────────────────> verify
```

## Ownership boundaries

### Command layer: `bin/` and `src/`

The ESM CLI parses six commands, loads a frozen configuration, invokes a command module, and writes either one concise
human message or one JSON result. Subprocesses receive argument arrays and an explicit environment. Exit codes distinguish
invalid input, missing dependencies, operational failures, and rejected artifacts.

### Browser engine: `engine/browser/`

The browser engine launches Playwright, creates a run-scoped video context, and passes controlled helpers to the
adapter. The beat recorder accepts each expected beat exactly once and in order. `linearScroll` temporarily disables
CSS smooth scrolling and drives position with `requestAnimationFrame`, producing constant-rate motion.

The adapter owns all application knowledge. Core browser modules must never contain application routes, selectors,
credentials, fixture identities, or expected business values.

### Media engine: `engine/media/`

The media engine resolves narration against measured beat timestamps, renders all speech in one model session, measures
real WAV durations, and shifts a line only far enough to clear the previous line. If a line then crosses the next visual
beat, the render stops. That is a capture/script timing defect, not something to hide in the mix.

Subtitle cards use those same lines and WAV durations. Cards are balanced, limited to two rows by default, and truncated
at the next cue boundary rather than displayed simultaneously. FFmpeg normalizes the canvas without cropping, burns the
SRT, loudness-normalizes speech, optionally ducks looping BGM, and writes H.264/AAC with fast-start metadata.

### Verification boundary

`verify` is independent of the render process. It probes the actual `demo.mp4`, reads the persisted beat manifest, and
rejects a missing audio stream, a non-H.264/AAC codec pair, wrong dimensions, a duration outside configured bounds, or a
missing required beat. A zero process exit or existing filename is never treated as sufficient proof.

## Run isolation

Every capture creates `$outputDir/<timestamp>-<suffix>/`. Capture, narration, sidecars, and verification all refer to
that directory. `run` passes it explicitly between stages; standalone `narrate` and `verify` choose the newest directory
containing the required input artifact.

Model files and TTS caches live under a user data directory, never inside a run or Git checkout. Concurrent mutation of
one run is not supported in v0.1; full multi-agent locking is tracked on the public roadmap.

## Failure and cleanup

The browser context closes after both success and failure. Scenario `cleanup` then releases servers or fixtures, and the
browser process closes last. The first operational error remains authoritative; cleanup errors surface only when no
earlier failure exists.

Shell stages use strict mode, quoted paths, explicit executables, and generated run directories. Node never invokes a
shell with interpolated user input. The one shell boundary is a fixed `bash narrate.sh` call whose configuration crosses
as environment values.
