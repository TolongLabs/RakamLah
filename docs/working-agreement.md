# Working Agreement

Detailed policies live here so `AGENTS.md` remains quick to load.

## Documentation Hygiene

- `docs/README.md` is the single repository landing page; do not add a competing root README.
- Keep implemented behavior, experimental behavior, and roadmap proposals visibly separate.
- The GitHub issue tracker is the roadmap. Documentation links to issues instead of maintaining duplicate checklists.
- Update command examples and configuration reference in the same change that modifies their behavior.
- Use relative repository links and never publish absolute developer paths.

## Design Standards

- Optimize terminal output for scanning: concise human diagnostics and stable structured JSON for automation.
- Maintain one source of truth for narration and subtitles.
- Prefer visible proof over feature inventory in examples and screenshots.
- Motion should be linear, intentional, and comfortable; respect reduced-motion settings where relevant.
- Subtitle defaults must stay readable at 1080p and support at most two non-overlapping rows.

## How Work Ships

The initial repository creation is the bootstrap exception. Subsequent changes use conventional branches, reviewable
pull requests, squash merges, and conventional commit subjects. Release tags point to commits already present on the
remote default branch.

For a release:

1. Run tests and lint locally.
2. Verify media hashes and Git LFS pointers.
3. Scan tracked files for secrets, machine paths, stale names, and unsupported claims.
4. Test headless commands from a fresh clone.
5. Confirm remote metadata, issues, tag, and release independently.

## Critical Do-Nots

- Do not embed project selectors, credentials, private fixtures, or customer data in core modules.
- Do not claim that a successful process exit produced a valid video; inspect and probe the artifact.
- Do not silently fall back from an explicitly selected voice, BGM, browser, or output configuration.
- Do not publish a voice reference without redistribution and cloning consent.
- Do not write generated captures or model caches into the repository.
- Do not let parallel workers share an output directory.
- Do not advertise the planned TUI or customization studio as available in v0.1.0.

## Stop Conditions

Stop and ask when required authority is absent, a public asset's redistribution rights are unknown, a destructive target
is ambiguous, a credential would need to be exposed, the requested interface has two materially different meanings, or
the same external blocker persists after safe retries. Otherwise make a reversible in-scope assumption and document it.
