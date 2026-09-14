#!/usr/bin/env bash
# PostToolUse(Edit|Write|MultiEdit): format the edited file. Exits 0 on any failure.
set -uo pipefail

command -v jq >/dev/null 2>&1 || exit 0
file=$(jq -r '.tool_input.file_path // empty' 2>/dev/null) || exit 0
[[ -f "${file:-}" ]] || exit 0

pnpm_run() {
  if command -v pnpm >/dev/null 2>&1; then
    pnpm "$@"
  elif command -v corepack >/dev/null 2>&1; then
    corepack pnpm "$@"
  else
    return 1
  fi
}

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.jsonc|*.css|*.html|*.md|*.markdown|*.yaml|*.yml)
    pnpm_run exec prettier --write "$file" >/dev/null 2>&1
    ;;
esac
exit 0
