# AGENTS.md

Canonical instructions for RakamLah. It is an independent TolongLabs product: a portable, open-source suite for
scripted browser recording, narration, subtitles, music, and deliverable verification.

## Product Boundary

RakamLah owns capture and media orchestration. Consuming projects own URLs, authentication, fixtures, selectors,
scenario choreography, narration, and product assertions. Keep the engine framework-neutral and deployment-neutral.

Version 0.1.0 provides headless commands and a neutral local example. Interactive CLI/TUI customization, chapter
recording, deterministic replay, and advanced visual controls are roadmap work. Do not document planned behavior as
shipped.

## Layout

| Path                   | Owns                                                      |
| ---------------------- | --------------------------------------------------------- |
| `bin/`, `src/`         | Headless CLI, config, command dispatch, structured output |
| `engine/browser/`      | Playwright capture, beats, and camera motion              |
| `engine/media/`        | TTS, scheduling, subtitles, ffmpeg assembly               |
| `examples/basic/`      | Synthetic, locally runnable portability example           |
| `media/`               | Git LFS BGM and consent-cleared voice references          |
| `docs/`                | Landing page and focused product/technical guidance       |
| `.agents/`, `.claude/` | Repository-local agent skills, adapters, and hooks        |
| `.github/`             | CI, issue forms, ownership, and review templates          |

Read [`docs/architecture.md`](docs/architecture.md) before changing boundaries,
[`docs/configuration.md`](docs/configuration.md) before changing config or adapter contracts, and
[`docs/agent-integration.md`](docs/agent-integration.md) before changing JSON output or exit codes. Full working and
documentation rules live in [`docs/working-agreement.md`](docs/working-agreement.md). Optional local tooling is covered
by [`docs/agent-tooling.md`](docs/agent-tooling.md).

## Commands

```bash
pnpm install
pnpm test
pnpm lint
pnpm rakam doctor --config examples/basic/rakam.config.mjs
pnpm rakam validate --config examples/basic/rakam.config.mjs --json
pnpm rakam run --config examples/basic/rakam.config.mjs --json
```

Use `rtk` as the command prefix when installed. Never commit `.env`, credentials, generated recordings, TTS/model
caches, worker prompts/logs, or machine-specific paths.

## Engineering Rules

- Develop runtime behavior test-first and verify the failing test before implementation.
- Keep modules small, explicit, and independently testable. Avoid framework-specific assumptions in core code.
- Resolve user paths relative to the config file. Pass subprocess arguments as arrays; never interpolate untrusted
  values into a shell command.
- Never prompt in CI. With `--json`, stdout contains one final JSON object and diagnostics go to stderr.
- Preserve exit codes: 0 success, 2 invalid input, 3 missing dependency, 4 capture/render failure, 5 failed verification.
- Narration audio and burned subtitles come from the same manifest. A line must not cross its next visible beat.
- Added voice samples require redistribution and cloning consent. Follow [`RESPONSIBLE_USE.md`](RESPONSIBLE_USE.md).
- Use synthetic data in examples and tests. No third-party product names, marks, accounts, or live services.
- Fix related defects exposed by checks; leave unrelated code alone.

## Git Workflow

After the initial repository bootstrap, work on `<type>/<slug>`, open a reviewable PR, and squash-merge into `main`.
Do not force-push or commit directly to `main`. Before completion, inspect the diff, run proportional checks, verify
generated artifacts directly, and compare the pushed commit with the intended release tag.
