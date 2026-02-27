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

DATA_DIR="$HOME/.claude/claude-code-zero/plugin-bookmarks/data"

mkdir -p "$DATA_DIR"

if [ ! -f "$DATA_DIR/wishlist.json" ]; then
  echo '{"plugins": {}}' > "$DATA_DIR/wishlist.json"
fi

exit 0
