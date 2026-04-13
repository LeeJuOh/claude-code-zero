#!/usr/bin/env bash
set -eu

# SessionStart hook — ensure WorktreeCreate/WorktreeRemove hooks are in settings.json
#
# Plugin hooks.json cannot reliably fire WorktreeCreate/WorktreeRemove for
# `claude -w` (CLI --worktree) because the worktree is created before plugins
# load. Settings.json hooks load earlier, so we inject there instead.
#
# Fast path: if hooks already point to the current plugin root, exit immediately.

command -v jq >/dev/null 2>&1 || exit 0

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-}"
[ -n "$PLUGIN_ROOT" ] || exit 0

EXPECTED_CREATE="$PLUGIN_ROOT/hooks/scripts/worktree-create.sh"
EXPECTED_REMOVE="$PLUGIN_ROOT/hooks/scripts/worktree-remove.sh"

# Scope detection: find which settings file has worktree-plus in enabledPlugins
SETTINGS_FILE=""
for candidate in \
  "$PWD/.claude/settings.local.json" \
  "$PWD/.claude/settings.json" \
  "$HOME/.claude/settings.json"; do
  [ -f "$candidate" ] || continue
  jq -e '.enabledPlugins // {} | keys | map(select(startswith("worktree-plus@"))) | length > 0' "$candidate" >/dev/null 2>&1 || continue
  SETTINGS_FILE="$candidate"
  break
done

# Not found in enabledPlugins — likely --plugin-dir dev mode, skip
[ -n "$SETTINGS_FILE" ] || exit 0
[ -f "$SETTINGS_FILE" ] || exit 0

# Fast path: check current state without modification
ACTUAL_CREATE=$(jq -r '[.hooks.WorktreeCreate[]?.hooks[]?.command // empty] | map(select(contains("worktree-plus"))) | .[0] // empty' "$SETTINGS_FILE" 2>/dev/null || true)
ACTUAL_REMOVE=$(jq -r '[.hooks.WorktreeRemove[]?.hooks[]?.command // empty] | map(select(contains("worktree-plus"))) | .[0] // empty' "$SETTINGS_FILE" 2>/dev/null || true)

if [ "$ACTUAL_CREATE" = "$EXPECTED_CREATE" ] && [ "$ACTUAL_REMOVE" = "$EXPECTED_REMOVE" ]; then
  exit 0
fi

# --- Needs update ---

SETTINGS=$(cat "$SETTINGS_FILE")

# Ensure .hooks key exists
if ! echo "$SETTINGS" | jq -e '.hooks' >/dev/null 2>&1; then
  SETTINGS=$(echo "$SETTINGS" | jq '.hooks = {}')
fi

CHANGES=()

configure_hook() {
  local HOOK_NAME="$1" EXPECTED_CMD="$2"

  local OUR_CMD
  OUR_CMD=$(echo "$SETTINGS" | jq -r \
    --arg name "$HOOK_NAME" \
    '[.hooks[$name][]?.hooks[]?.command // empty] | map(select(contains("worktree-plus"))) | .[0] // empty' \
    2>/dev/null || true)

  if [ -z "$OUR_CMD" ]; then
    local HAS_ANY
    HAS_ANY=$(echo "$SETTINGS" | jq -r --arg name "$HOOK_NAME" '.hooks[$name] // empty')
    if [ -z "$HAS_ANY" ]; then
      SETTINGS=$(echo "$SETTINGS" | jq \
        --arg name "$HOOK_NAME" --arg cmd "$EXPECTED_CMD" \
        '.hooks[$name] = [{"hooks": [{"type": "command", "command": $cmd}]}]')
    else
      SETTINGS=$(echo "$SETTINGS" | jq \
        --arg name "$HOOK_NAME" --arg cmd "$EXPECTED_CMD" \
        '.hooks[$name] += [{"hooks": [{"type": "command", "command": $cmd}]}]')
    fi
    CHANGES+=("added $HOOK_NAME")
  elif [ "$OUR_CMD" != "$EXPECTED_CMD" ]; then
    SETTINGS=$(echo "$SETTINGS" | jq \
      --arg name "$HOOK_NAME" --arg old "$OUR_CMD" --arg new "$EXPECTED_CMD" \
      '(.hooks[$name][]?.hooks[]? | select(.command == $old) | .command) = $new')
    CHANGES+=("updated $HOOK_NAME")
  fi
}

configure_hook "WorktreeCreate" "$EXPECTED_CREATE"
configure_hook "WorktreeRemove" "$EXPECTED_REMOVE"

if [ ${#CHANGES[@]} -gt 0 ]; then
  TEMP_FILE="${SETTINGS_FILE}.tmp.$$"
  echo "$SETTINGS" | jq '.' > "$TEMP_FILE"
  mv "$TEMP_FILE" "$SETTINGS_FILE"

  SUMMARY=$(IFS=', '; echo "${CHANGES[*]}")
  jq -n --arg msg "worktree-plus: auto-configured hooks in settings.json ($SUMMARY). Plugin hooks.json cannot fire WorktreeCreate before plugin load, so settings.json is used instead." \
    '{ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: $msg } }'
fi

exit 0
