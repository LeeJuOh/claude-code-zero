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
  echo "Official Codex plugin not found. Run these steps in order:" >&2
  echo "  1. /plugin marketplace add openai/codex-plugin-cc" >&2
  echo "  2. /plugin install codex@openai-codex" >&2
  echo "  3. /reload-plugins" >&2
  echo "Or run /codex-setup for guided installation." >&2
  exit 1
fi

echo "$CODEX_COMPANION"
