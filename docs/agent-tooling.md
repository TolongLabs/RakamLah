# Agent Tooling

RakamLah keeps one canonical instruction layer while accommodating different coding agents.

## Instruction Files

`AGENTS.md` is canonical. `CLAUDE.md` and `GEMINI.md` import it for their respective runtimes. Agents without a native
repository instruction convention should read `AGENTS.md` and [`agent-integration.md`](agent-integration.md) before
calling RakamLah.

## Repository-Local Skills

Product-neutral skills live under `.agents/skills/`. Claude-compatible links under `.claude/skills/` point to that
canonical copy. `skills-lock.json` records reinstallable upstream packages; `.agents/skills/VENDORED.md` documents
material that is intentionally committed.

## Hooks

| Hook               | Event            | Purpose                                                  |
| ------------------ | ---------------- | -------------------------------------------------------- |
| `session-brief.sh` | Session start    | Shows branch, dirty count, and verification commands     |
| `env-drift.mjs`    | Session start    | Compares public defaults without revealing local values  |
| `guard-git.sh`     | Before shell use | Blocks direct/forced pushes to `main` and staging `.env` |
| `format-edited.sh` | After edits      | Runs Prettier on supported project files                 |

Hook failures remain non-blocking unless they detect an intentionally prohibited Git operation.

## Optional CLIs

When installed, prefix shell commands with `rtk` to reduce noisy output. Graphify can map architectural relationships
after the codebase grows; its local output remains ignored. External coding workers must use isolated, credential-free
directories, exclusive output paths, explicit models/permissions, and artifact-level verification.

RakamLah's own `--json` commands are the vendor-neutral automation boundary. Agent integrations must not scrape human
output or depend on one vendor's MCP implementation.
