#!/usr/bin/env bash
# SessionStart: concise repository orientation. Internal failures stay non-blocking.
set -uo pipefail

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[[ -d "${root:-}" ]] || exit 0
cd "$root" || exit 0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')
dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

echo "RakamLah | branch=$branch | uncommitted=$dirty"
echo "Checks: pnpm test && pnpm lint"
echo "Start with AGENTS.md; headless contract: docs/agent-integration.md"
