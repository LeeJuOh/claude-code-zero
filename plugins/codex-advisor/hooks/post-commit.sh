#!/usr/bin/env bash
# PostToolUse(Bash) hook: detect git commit and suggest codex review
set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Only trigger on git commit commands
if echo "$COMMAND" | grep -qE 'git\s+commit'; then
  jq -n '{
    "additionalContext": "Code was just committed. You can suggest running /review for a Codex double-check if appropriate."
  }'
fi

exit 0
