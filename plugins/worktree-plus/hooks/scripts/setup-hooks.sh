#!/usr/bin/env bash
set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Scope detection: find which settings file has worktree-plus in enabledPlugins
SETTINGS_FILE=""
SCOPE=""
for candidate in \
  "$PWD/.claude/settings.local.json" \
  "$PWD/.claude/settings.json" \
  "$HOME/.claude/settings.json"; do
  if [ -f "$candidate" ] && jq -e '.enabledPlugins // {} | keys | map(select(startswith("worktree-plus@"))) | length > 0' "$candidate" >/dev/null 2>&1; then
    SETTINGS_FILE="$candidate"
    case "$candidate" in
      "$HOME/.claude/settings.json") SCOPE="user" ;;
      "$PWD/.claude/settings.json") SCOPE="project" ;;
      *) SCOPE="local" ;;
    esac
    break
  fi
done

if [ -z "$SETTINGS_FILE" ]; then
  echo "Error: worktree-plus not found in any settings file's enabledPlugins." >&2
  echo "Install first: claude plugin install worktree-plus@claude-code-zero" >&2
  exit 1
fi

echo "Plugin root: $PLUGIN_ROOT"
echo "Target: $SETTINGS_FILE ($SCOPE scope)"
echo ""

# Ensure settings file exists
if [[ ! -f "$SETTINGS_FILE" ]]; then
  mkdir -p "$(dirname "$SETTINGS_FILE")"
  echo '{}' > "$SETTINGS_FILE"
  echo "Created $SETTINGS_FILE"
fi

SETTINGS=$(cat "$SETTINGS_FILE")

# Ensure .hooks key exists
if ! echo "$SETTINGS" | jq -e '.hooks' >/dev/null 2>&1; then
  SETTINGS=$(echo "$SETTINGS" | jq '.hooks = {}')
fi

EXPECTED_CREATE="$PLUGIN_ROOT/hooks/scripts/worktree-create.sh"
EXPECTED_REMOVE="$PLUGIN_ROOT/hooks/scripts/worktree-remove.sh"

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
      # No hooks for this event — create
      SETTINGS=$(echo "$SETTINGS" | jq \
        --arg name "$HOOK_NAME" --arg cmd "$EXPECTED_CMD" \
        '.hooks[$name] = [{"hooks": [{"type": "command", "command": $cmd}]}]')
      echo "  Added $HOOK_NAME"
    else
      # Other hooks exist — append alongside
      SETTINGS=$(echo "$SETTINGS" | jq \
        --arg name "$HOOK_NAME" --arg cmd "$EXPECTED_CMD" \
        '.hooks[$name] += [{"hooks": [{"type": "command", "command": $cmd}]}]')
      echo "  Added $HOOK_NAME (alongside existing hooks)"
    fi
  elif [[ "$OUR_CMD" == "$EXPECTED_CMD" ]]; then
    echo "  $HOOK_NAME already configured"
  else
    # Stale path — replace the entire array entry containing our command
    SETTINGS=$(echo "$SETTINGS" | jq \
      --arg name "$HOOK_NAME" --arg old "$OUR_CMD" --arg new "$EXPECTED_CMD" \
      '(.hooks[$name][]?.hooks[]? | select(.command == $old) | .command) = $new')
    echo "  Updated $HOOK_NAME (stale path)"
  fi
}

echo "Configuring hooks..."
configure_hook "WorktreeCreate" "$EXPECTED_CREATE"
configure_hook "WorktreeRemove" "$EXPECTED_REMOVE"

# Atomic write
TEMP_FILE="${SETTINGS_FILE}.tmp.$$"
echo "$SETTINGS" | jq '.' > "$TEMP_FILE"
mv "$TEMP_FILE" "$SETTINGS_FILE"

# Clean up orphan hooks in other settings files (from old path-based detection)
for other in \
  "$PWD/.claude/settings.local.json" \
  "$PWD/.claude/settings.json" \
  "$HOME/.claude/settings.json"; do
  [ "$other" = "$SETTINGS_FILE" ] && continue
  [ ! -f "$other" ] && continue

  HAS_OURS=$(jq '[.hooks.WorktreeCreate[]?.hooks[]?.command // empty, .hooks.WorktreeRemove[]?.hooks[]?.command // empty] | map(select(contains("worktree-plus"))) | length' "$other" 2>/dev/null || echo "0")
  if [ "$HAS_OURS" -gt 0 ]; then
    jq '
      (.hooks.WorktreeCreate // []) |= map(select(.hooks | all(.command | contains("worktree-plus") | not))) |
      (.hooks.WorktreeRemove // []) |= map(select(.hooks | all(.command | contains("worktree-plus") | not))) |
      if .hooks.WorktreeCreate == [] then del(.hooks.WorktreeCreate) else . end |
      if .hooks.WorktreeRemove == [] then del(.hooks.WorktreeRemove) else . end
    ' "$other" > "${other}.tmp.$$"
    mv "${other}.tmp.$$" "$other"
    echo "  Cleaned orphan hooks from $other"
  fi
done

echo ""
echo "Done. Restart Claude Code for changes to take effect."
