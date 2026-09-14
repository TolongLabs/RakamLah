#!/usr/bin/env bash
# PreToolUse(Bash): this repo merges through PRs. Exits 0 on any internal failure.
# Matches the command substring, so an `rtk`-prefixed command is caught too.
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0
cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[[ -n "$cmd" ]] || exit 0

# exit 2 plus stderr feeds the reason back to the agent
deny() { echo "BLOCKED: $1" >&2; exit 2; }

has() { grep -Eq "$1" <<<"$cmd"; }

if has 'git[[:space:]]+push([[:space:]]|$)'; then
  has '(--force|--force-with-lease|[[:space:]]-f)([[:space:]]|$)' && has '\b(main|HEAD:main)\b' \
    && deny "force-push to main. Open a PR instead."
  has 'git[[:space:]]+push([[:space:]]+-[^[:space:]]+)*[[:space:]]+origin[[:space:]]+main([[:space:]]|$)' \
    && deny "direct push to main. Branch and open a PR (see AGENTS.md)."
fi

has 'git[[:space:]]+add\b' && has '(^|[[:space:]])\.env([[:space:]]|$)' \
  && deny ".env holds live keys and is gitignored. Update .env.example instead."

exit 0
