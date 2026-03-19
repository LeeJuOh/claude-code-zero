#!/bin/bash
# PreToolUse hook — lazy data init with project-level isolation.
#
# When Claude reads the data-path file, this hook:
#   1. Detects install scope (project vs user) via settings.json
#   2. Resolves the correct data directory (per-project hash or global)
#   3. Runs one-time migration from legacy paths
#   4. Initializes data files if missing
#   5. Writes the resolved path to data-path for Claude to read
#
# Auto-approve is NOT needed here — the skill's bare allowed-tools
# (Read, Write, Edit) already auto-approves all paths.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
FILE_PATH="${FILE_PATH/#\~/$HOME}"

PLUGIN_NAME="plugin-bookmarks"
STABLE_DIR="$HOME/.claude-code-zero/$PLUGIN_NAME"
BASE_DIR="${CLAUDE_PLUGIN_DATA:-$STABLE_DIR}"
DATA_PATH_FILE="$STABLE_DIR/data-path"

# data-path read request → lazy init
if [ "$FILE_PATH" = "$DATA_PATH_FILE" ]; then
  # Scope detection: project/local settings → project-specific, user-only → global
  PLUGIN_KEY="plugin-bookmarks@claude-code-zero"
  PROJECT_ENABLED=$(jq -r ".enabledPlugins[\"$PLUGIN_KEY\"] // false" "$PWD/.claude/settings.json" 2>/dev/null)
  LOCAL_ENABLED=$(jq -r ".enabledPlugins[\"$PLUGIN_KEY\"] // false" "$PWD/.claude/settings.local.json" 2>/dev/null)

  if [ "$PROJECT_ENABLED" = "true" ] || [ "$LOCAL_ENABLED" = "true" ]; then
    HASH=$(echo -n "$PWD" | md5 -q 2>/dev/null || echo -n "$PWD" | md5sum | cut -d' ' -f1)
    DATA_DIR="$BASE_DIR/projects/$HASH/data"
  else
    DATA_DIR="$BASE_DIR/global/data"
  fi

  # Migration: data/ → global/data/ (one-time, from pre-isolation layout)
  if [ -d "$STABLE_DIR/data" ] && [ ! -d "$BASE_DIR/global/data" ]; then
    mkdir -p "$BASE_DIR/global/data"
    cp -r "$STABLE_DIR/data"/. "$BASE_DIR/global/data"/
    mv "$STABLE_DIR/data" "$STABLE_DIR/data.migrated" 2>/dev/null || true
  fi

  # Legacy migration (v1/v2 → global/data/)
  for OLD in "$HOME/.claude/plugins/$PLUGIN_NAME/data" "$HOME/.claude/claude-code-zero/$PLUGIN_NAME/data"; do
    if [ -d "$OLD" ] && [ ! -d "$BASE_DIR/global/data" ]; then
      mkdir -p "$BASE_DIR/global/data"
      cp -r "$OLD"/. "$BASE_DIR/global/data"/
    fi
  done

  # Migration: ~/.claude-code-zero/ → ${CLAUDE_PLUGIN_DATA}/ (when env var becomes available)
  if [ -n "$CLAUDE_PLUGIN_DATA" ] && [ "$CLAUDE_PLUGIN_DATA" != "$STABLE_DIR" ]; then
    for SUBDIR in global projects; do
      if [ -d "$STABLE_DIR/$SUBDIR" ] && [ ! -d "$CLAUDE_PLUGIN_DATA/$SUBDIR" ]; then
        cp -r "$STABLE_DIR/$SUBDIR" "$CLAUDE_PLUGIN_DATA/"
      fi
    done
  fi

  # Initialize data directory and default file
  mkdir -p "$DATA_DIR"
  [ -f "$DATA_DIR/wishlist.json" ] || echo '{"plugins":{}}' > "$DATA_DIR/wishlist.json"

  # Write resolved path for Claude to read
  mkdir -p "$(dirname "$DATA_PATH_FILE")"
  echo "$DATA_DIR" > "$DATA_PATH_FILE"
  echo '{"decision":"approve"}'
  exit 0
fi

exit 0
