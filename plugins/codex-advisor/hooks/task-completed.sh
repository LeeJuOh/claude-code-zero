#!/usr/bin/env bash
# TaskCompleted hook: suggest codex verification after task completion
set -euo pipefail

INPUT=$(cat)
SUBJECT=$(echo "$INPUT" | jq -r '.task_subject // ""')

# Check if there are actual code changes to verify
HAS_CHANGES=false
if git diff --stat HEAD~1 HEAD 2>/dev/null | grep -q '.'; then
  HAS_CHANGES=true
elif git diff --stat 2>/dev/null | grep -q '.'; then
  HAS_CHANGES=true
fi

if [ "$HAS_CHANGES" = "true" ]; then
  jq -n '{
    "additionalContext": "Task completed with code changes detected. You can suggest running /codex-verify for Codex verification if appropriate."
  }'
fi

exit 0
