#!/usr/bin/env bash
# Resolve the Official Codex plugin's companion script path.
# Outputs the absolute path on success, error message on stderr + exit 1 on failure.
#
# Search order (first match wins):
#   1. Marketplace installs (most common)
#   2. Plugin-dir overrides (local development)
# Within each location, prefer the newest file if multiple exist.
set -euo pipefail

PLUGINS_DIR="${HOME}/.claude/plugins"

# Collect all candidates, newest first
CODEX_COMPANION=""
while IFS= read -r candidate; do
  if [ -f "$candidate" ]; then
    CODEX_COMPANION="$candidate"
    break
  fi
done < <(find "$PLUGINS_DIR" -path "*/codex/scripts/codex-companion.mjs" -print 2>/dev/null \
  | xargs ls -t 2>/dev/null)

if [ -z "$CODEX_COMPANION" ]; then
  echo "Official Codex plugin not found. Install: /plugin install codex@openai-codex then /reload-plugins" >&2
  exit 1
fi

echo "$CODEX_COMPANION"
