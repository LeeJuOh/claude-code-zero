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

# If settings file doesn't exist or jq not available, warn and exit
if ! command -v jq >/dev/null 2>&1; then
  jq -n --arg msg "worktree-plus: jq is required for auto-configuration. Install jq and restart." \
    '{ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: $msg } }'
  exit 0
fi

if [[ ! -f "$SETTINGS_FILE" ]]; then
  mkdir -p "$(dirname "$SETTINGS_FILE")"
  echo '{}' > "$SETTINGS_FILE"
fi

SETTINGS=$(cat "$SETTINGS_FILE")

# Ensure .hooks key exists
if ! echo "$SETTINGS" | jq -e '.hooks' >/dev/null 2>&1; then
  SETTINGS=$(echo "$SETTINGS" | jq '.hooks = {}')
fi

# Check current state
ACTUAL_CREATE=$(echo "$SETTINGS" | jq -r \
  '[.hooks.WorktreeCreate[]?.hooks[]?.command // empty] | map(select(contains("worktree-plus"))) | .[0] // empty' \
  2>/dev/null || true)
ACTUAL_REMOVE=$(echo "$SETTINGS" | jq -r \
  '[.hooks.WorktreeRemove[]?.hooks[]?.command // empty] | map(select(contains("worktree-plus"))) | .[0] // empty' \
  2>/dev/null || true)

# Already up-to-date — exit silently
if [[ "$ACTUAL_CREATE" == "$EXPECTED_CREATE" ]] && [[ "$ACTUAL_REMOVE" == "$EXPECTED_REMOVE" ]]; then
  exit 0
fi

# --- Auto-fix: add or update hooks ---

CHANGES=()

configure_hook() {
  local HOOK_NAME="$1"
  local EXPECTED_CMD="$2"

  # Find worktree-plus entry (if any)
  local OUR_CMD
  OUR_CMD=$(echo "$SETTINGS" | jq -r \
    --arg name "$HOOK_NAME" \
    '[.hooks[$name][]?.hooks[]?.command // empty] | map(select(contains("worktree-plus"))) | .[0] // empty' \
    2>/dev/null || true)

  if [[ -z "$OUR_CMD" ]]; then
    # No worktree-plus entry — check if event has any hooks at all
    local HAS_ANY
    HAS_ANY=$(echo "$SETTINGS" | jq -r --arg name "$HOOK_NAME" '.hooks[$name] // empty')

    if [[ -z "$HAS_ANY" ]]; then
      SETTINGS=$(echo "$SETTINGS" | jq \
        --arg name "$HOOK_NAME" --arg cmd "$EXPECTED_CMD" \
        '.hooks[$name] = [{"hooks": [{"type": "command", "command": $cmd}]}]')
      CHANGES+=("added $HOOK_NAME")
    else
      SETTINGS=$(echo "$SETTINGS" | jq \
        --arg name "$HOOK_NAME" --arg cmd "$EXPECTED_CMD" \
        '.hooks[$name] += [{"hooks": [{"type": "command", "command": $cmd}]}]')
      CHANGES+=("added $HOOK_NAME")
    fi
  elif [[ "$OUR_CMD" != "$EXPECTED_CMD" ]]; then
    SETTINGS=$(echo "$SETTINGS" | jq \
      --arg name "$HOOK_NAME" --arg old "$OUR_CMD" --arg new "$EXPECTED_CMD" \
      '(.hooks[$name][]?.hooks[]? | select(.command == $old) | .command) = $new')
    CHANGES+=("updated $HOOK_NAME")
  fi
}

configure_hook "WorktreeCreate" "$EXPECTED_CREATE"
configure_hook "WorktreeRemove" "$EXPECTED_REMOVE"

# Write only if changes were made
if [[ ${#CHANGES[@]} -gt 0 ]]; then
  TEMP_FILE="${SETTINGS_FILE}.tmp.$$"
  echo "$SETTINGS" | jq '.' > "$TEMP_FILE"
  mv "$TEMP_FILE" "$SETTINGS_FILE"

  SUMMARY=$(IFS=', '; echo "${CHANGES[*]}")
  jq -n --arg msg "worktree-plus: auto-configured hooks ($SUMMARY). Restart Claude Code for changes to take effect." \
    '{ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: $msg } }'
fi

exit 0
