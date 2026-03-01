#!/bin/bash
# PreToolUse hook — initialize data directory when plugin-bookmarks skill is invoked.

INPUT=$(cat)
SKILL_NAME=$(echo "$INPUT" | jq -r '.tool_input.skill // ""')

case "$SKILL_NAME" in
  plugin-bookmarks:plugin-bookmarks|plugin-bookmarks)
    ;;
  *)
    exit 0
    ;;
esac

DATA_DIR="$HOME/.claude-code-zero/plugin-bookmarks/data"
OLD_DIR_V2="$HOME/.claude/plugins/plugin-bookmarks/data"
OLD_DIR_V1="$HOME/.claude/claude-code-zero/plugin-bookmarks/data"

# Migrate from old path if new path doesn't exist yet
if [ ! -d "$DATA_DIR" ]; then
  if [ -d "$OLD_DIR_V2" ]; then
    mkdir -p "$DATA_DIR"
    cp -r "$OLD_DIR_V2"/. "$DATA_DIR"/
  elif [ -d "$OLD_DIR_V1" ]; then
    mkdir -p "$DATA_DIR"
    cp -r "$OLD_DIR_V1"/. "$DATA_DIR"/
  fi
fi

mkdir -p "$DATA_DIR"

if [ ! -f "$DATA_DIR/wishlist.json" ]; then
  echo '{"plugins": {}}' > "$DATA_DIR/wishlist.json"
fi

exit 0
