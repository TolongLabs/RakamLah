# Contributing to RakamLah

Thank you for helping make repeatable browser recording more accessible. Contributions are welcome across capture,
media, documentation, examples, tests, and developer experience.

## Before opening code

Search the [issue tracker](https://github.com/TolongLabs/RakamLah/issues) for related work. For a substantial interface
or architecture change, open a proposal first so maintainers and implementers agree on the contract before code grows
around it.

RakamLah's boundary is intentional: core owns recording and media mechanics; adapters own application URLs, selectors,
fixtures, and assertions. A reusable improvement belongs in `engine/` or `src/`. Application-specific behavior belongs
in an example or external adapter.

## Local setup

```bash
git lfs install
git lfs pull
corepack pnpm install --frozen-lockfile
corepack pnpm exec playwright install chromium
corepack pnpm test
corepack pnpm lint
```

Bash, FFmpeg, FFprobe, Python 3, and Node.js 20.11 or newer must be available on `PATH`. Speech-model setup is optional
for unit tests but required for a passing `doctor`; see [`docs/voices.md`](docs/voices.md) before a full render.

## Development flow

1. Create a branch named `<type>/<short-description>`, such as `fix/subtitle-boundary`.
2. Add a behavioral test and watch it fail for the expected reason.
3. Implement the smallest coherent change.
4. Run focused tests, then `corepack pnpm test` and `corepack pnpm lint`.
5. Inspect generated media directly when your change affects capture or rendering.
6. Open a pull request using the repository template.

Use conventional commit subjects (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). Pull requests are squash-merged into
`main`; do not force-push the default branch.

## Compatibility expectations

- Keep the headless interface non-interactive.
- Preserve exit codes and one-object `--json` output unless a versioned change is explicitly approved.
- Resolve user paths from the configuration file, not the current working directory.
- Pass subprocess arguments as arrays. Never construct a command by interpolating untrusted input.
- Keep examples synthetic, local, and free of third-party accounts or marks.
- Update [`docs/configuration.md`](docs/configuration.md) and [`docs/agent-integration.md`](docs/agent-integration.md) in
  the same pull request as their contracts.

## Adding media

Do not add audio until its use, voice-synthesis, and redistribution rights are explicit. Every accepted asset must:

1. live under `media/bgm/` or `media/voices/`;
2. be tracked by Git LFS;
3. have its exact byte size, SHA-256, format, duration, provenance, rights status, and authorization scope recorded in
   `media/manifest.json`;
4. update [`media/AUTHORIZATION.md`](media/AUTHORIZATION.md) with the evidence reviewed by a maintainer;
5. pass `node scripts/check-media.mjs`; and
6. comply with [`RESPONSIBLE_USE.md`](RESPONSIBLE_USE.md).

Do not commit model weights, generated WAV files, captures, rendered videos, or cache directories.

## Review

Reviewers focus on observable behavior, portability, agent safety, media integrity, and documentation truth. A passing
process is not enough for visual work: include the metadata inspected and a concise description of the frames or audio
you reviewed.

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). Security reports use the private route in
[`SECURITY.md`](SECURITY.md), not a public issue.
