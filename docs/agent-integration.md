# Agent Integration

RakamLah is designed for any automation runtime that can launch a local process, read stdout, and inspect an exit code.
The interface has no prompts, proprietary protocol, browser extension, or agent-specific dependency.

## Invocation contract

Use the executable directly to keep stdout free of package-manager banners:

```bash
node bin/rakam.mjs doctor --config /absolute/path/to/rakam.config.mjs --json
node bin/rakam.mjs validate --config /absolute/path/to/rakam.config.mjs --json
node bin/rakam.mjs run --config /absolute/path/to/rakam.config.mjs --json
```

In `--json` mode, stdout contains exactly one JSON object followed by a newline. A success object includes `ok: true`,
the command, a human-safe message, and command-specific fields. A failure has this v0.1 shape:

```json
{
  "ok": false,
  "command": "capture",
  "exitCode": 4,
  "message": "Capture failed: the outcome heading was not found"
}
```

Do not parse the human-readable mode. Do not infer success from an artifact path; require exit 0 and, for a final
deliverable, a passing `verify` result.

## Exit codes

| Code | Meaning                           | Agent response                                                     |
| ---- | --------------------------------- | ------------------------------------------------------------------ |
| `0`  | Success                           | Consume the result and declared artifacts                          |
| `2`  | Invalid input or configuration    | Repair config, arguments, narration, or adapter contract           |
| `3`  | Missing host dependency           | Install or expose the reported executable/package/input            |
| `4`  | Capture or media operation failed | Inspect the message; repair scenario, timing, TTS, or FFmpeg input |
| `5`  | Deliverable verification failed   | Do not publish; fix the named duration, stream, dimension, or beat |

Unknown process failures are mapped to 4 in v0.1. A richer versioned error taxonomy and progress event stream are
roadmap work.

## Recommended agent loop

1. Run `doctor --json` once for the chosen configuration.
2. Run `validate --json` after any config, scenario, or narration edit.
3. Run `capture --json` and retain its `runDir` when changing browser choreography.
4. Inspect `beats.json` and the raw capture before spending time on speech.
5. Run `narrate --json` after copy, subtitle, voice, or BGM changes.
6. Run `verify --json`; publish only when it returns 0.

`run --json` is convenient for a clean end-to-end pass. Split commands are faster for iteration because a narration
change does not require another browser capture.

## Example shell controller

```bash
set -euo pipefail

CONFIG="${1:?pass a configuration path}"
node bin/rakam.mjs doctor --config "$CONFIG" --json
node bin/rakam.mjs validate --config "$CONFIG" --json
result=$(node bin/rakam.mjs run --config "$CONFIG" --json)
printf '%s\n' "$result"
```

The controller should capture stdout separately from stderr and parse JSON only after checking that the child process
finished. Do not stream passwords or config contents into logs. Run parallel jobs with different output directories;
cross-process locks and explicit `--run-id` support are not yet shipped.

## Project instruction files

Agents modifying RakamLah itself read [`../AGENTS.md`](../AGENTS.md). The longer policies it links are intentionally
separate so the canonical file remains below 200 lines. Runtime-specific pointer files import the same instructions
instead of maintaining divergent copies.

The `.agents/skills/` directory contains product-neutral development playbooks. These are contributor tooling, not a
runtime requirement for calling `rakam`.
