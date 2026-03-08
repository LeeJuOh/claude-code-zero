#!/usr/bin/env bash
set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Scope detection
if [[ "$PLUGIN_ROOT" == "$HOME/.claude/plugins/cache/"* ]]; then
  SETTINGS_FILE="$HOME/.claude/settings.json"
else
  SETTINGS_FILE="$PWD/.claude/settings.local.json"
fi

# Check: do our hooks exist with current paths?
EXPECTED_CREATE="$PLUGIN_ROOT/hooks/scripts/worktree-create.sh"
EXPECTED_REMOVE="$PLUGIN_ROOT/hooks/scripts/worktree-remove.sh"

CONFIGURED=true

if [[ ! -f "$SETTINGS_FILE" ]]; then
  CONFIGURED=false
else
  ACTUAL_CREATE=$(jq -r \
    '[.hooks.WorktreeCreate[]?.hooks[]?.command // empty] | map(select(contains("worktree-plus"))) | .[0] // empty' \
    "$SETTINGS_FILE" 2>/dev/null || true)
  ACTUAL_REMOVE=$(jq -r \
    '[.hooks.WorktreeRemove[]?.hooks[]?.command // empty] | map(select(contains("worktree-plus"))) | .[0] // empty' \
    "$SETTINGS_FILE" 2>/dev/null || true)

  if [[ "$ACTUAL_CREATE" != "$EXPECTED_CREATE" ]] || [[ "$ACTUAL_REMOVE" != "$EXPECTED_REMOVE" ]]; then
    CONFIGURED=false
  fi
fi

if [[ "$CONFIGURED" == false ]]; then
  jq -n --arg msg \
    "worktree-plus: WorktreeCreate/WorktreeRemove hooks are not registered in $SETTINGS_FILE. Worktree features will not work until configured. Ask the user if they want to run /worktree-plus:setup to auto-configure." \
    '{ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: $msg } }'
fi

exit 0
