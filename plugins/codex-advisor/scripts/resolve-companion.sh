#!/usr/bin/env bash
# Resolve the Official Codex plugin's companion script path.
# Outputs the absolute path on success, error message on stderr + exit 1 on failure.
set -euo pipefail

CODEX_COMPANION=$(find ~/.claude/plugins -path "*/codex/scripts/codex-companion.mjs" 2>/dev/null | head -1)

if [ -z "$CODEX_COMPANION" ]; then
  echo "Official Codex plugin not found. Install: /plugin install codex@openai-codex" >&2
  exit 1
fi

echo "$CODEX_COMPANION"
