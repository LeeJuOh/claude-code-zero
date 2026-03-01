#!/bin/bash
# PreToolUse hook — auto-approve Read/Write/Edit for plugin data files.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Resolve ~ to $HOME
FILE_PATH="${FILE_PATH/#\~/$HOME}"

# Auto-approve if path is under our data directory
case "$FILE_PATH" in
  "$HOME/.claude-code-zero/plugin-bookmarks/data"/*)
    echo '{"decision": "approve"}'
    ;;
esac

exit 0
