#!/usr/bin/env bash
# Resolve the Official Codex plugin's companion script path.
# Prints absolute path on success; exits 1 with diagnostic on failure.
#
# Priority:
#   1. installed_plugins.json registry (source of truth)
#   2. cache/openai-codex/codex/<semver>/ — highest version wins
#   3. marketplaces/openai-codex/plugins/codex/ (marketplace mirror)
set -euo pipefail

PLUGINS_DIR="${HOME}/.claude/plugins"
TRIED=()

check() {
  TRIED+=("$1")
  [ -f "$1" ]
}

# 1. Registry
INSTALL_JSON="$PLUGINS_DIR/installed_plugins.json"
if [ -f "$INSTALL_JSON" ] && command -v jq >/dev/null 2>&1; then
  INSTALL_PATH=$(jq -r '.plugins["codex@openai-codex"][0].installPath // empty' "$INSTALL_JSON" 2>/dev/null || true)
  if [ -n "$INSTALL_PATH" ]; then
    CANDIDATE="$INSTALL_PATH/scripts/codex-companion.mjs"
    if check "$CANDIDATE"; then echo "$CANDIDATE"; exit 0; fi
  fi
fi

# 2. Cache — highest semver
CACHE_DIR="$PLUGINS_DIR/cache/openai-codex/codex"
if [ -d "$CACHE_DIR" ]; then
  while IFS= read -r version; do
    [ -z "$version" ] && continue
    [ -d "$CACHE_DIR/$version" ] || continue
    CANDIDATE="$CACHE_DIR/$version/scripts/codex-companion.mjs"
    if check "$CANDIDATE"; then echo "$CANDIDATE"; exit 0; fi
  done < <(ls -1 "$CACHE_DIR" 2>/dev/null | sort -V -r)
fi

# 3. Marketplace mirror
CANDIDATE="$PLUGINS_DIR/marketplaces/openai-codex/plugins/codex/scripts/codex-companion.mjs"
if check "$CANDIDATE"; then echo "$CANDIDATE"; exit 0; fi

{
  echo "Official Codex plugin not found. Tried:"
  for p in ${TRIED[@]+"${TRIED[@]}"}; do echo "  - $p"; done
  echo ""
  echo "Install steps (run in order):"
  echo "  1. /plugin marketplace add openai/codex-plugin-cc"
  echo "  2. /plugin install codex@openai-codex"
  echo "  3. /reload-plugins"
  echo "Or run /codex-setup for guided installation."
} >&2
exit 1
