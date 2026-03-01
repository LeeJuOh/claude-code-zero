#!/bin/bash
# PreToolUse hook — initialize data directory when notebooklm-manager skill is invoked.

INPUT=$(cat)
SKILL_NAME=$(echo "$INPUT" | jq -r '.tool_input.skill // ""')

# Only run for this plugin's skill
case "$SKILL_NAME" in
  notebooklm-connector:notebooklm-manager|notebooklm-connector:notebooklm|notebooklm)
    ;;
  *)
    exit 0
    ;;
esac

DATA_DIR="$HOME/.claude/plugins/notebooklm-connector/data"
OLD_DIR="$HOME/.claude/claude-code-zero/notebooklm-connector/data"

# Migrate from old path if new path doesn't exist yet
if [ ! -d "$DATA_DIR" ] && [ -d "$OLD_DIR" ]; then
  mkdir -p "$DATA_DIR"
  cp -r "$OLD_DIR"/. "$DATA_DIR"/
fi

mkdir -p "$DATA_DIR/notebooks"

if [ ! -f "$DATA_DIR/library.json" ]; then
  echo '{"notebooks": {}, "schema_version": "1.0", "updated_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > "$DATA_DIR/library.json"
fi

if [ ! -f "$DATA_DIR/archive.json" ]; then
  echo '{"notebooks": {}, "schema_version": "1.0", "updated_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > "$DATA_DIR/archive.json"
fi

exit 0
