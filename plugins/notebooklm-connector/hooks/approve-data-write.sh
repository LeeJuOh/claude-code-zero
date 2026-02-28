11#!/bin/bash
# PreToolUse hook — auto-approve Write operations targeting the plugin's data directory.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

DATA_DIR="$HOME/.claude/claude-code-zero/notebooklm-connector/data"

if [[ "$FILE_PATH" == "$DATA_DIR"/* ]]; then
  cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Auto-approved: write to notebooklm-connector data directory"
  }
}
EOF
else
  exit 0
fi
