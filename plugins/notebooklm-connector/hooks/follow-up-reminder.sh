#!/bin/bash
# PostToolUse hook — coverage analysis reminder after chrome-mcp-query completes.

INPUT=$(cat)

SUBAGENT_TYPE=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')
if [[ "$SUBAGENT_TYPE" != *"chrome-mcp-query"* ]]; then
  exit 0
fi

# Skip coverage reminder for Smart Add metadata discovery queries
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // ""')
if echo "$PROMPT" | grep -qiE 'What is the main topic and content'; then
  exit 0
fi

cat << 'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "COVERAGE_REMINDER: Before presenting the answer, perform coverage analysis per SKILL.md Section 5 (STEP A\u2192B\u2192C\u2192D). Check if all topics from the user's original question are covered in the response."
  }
}
EOF
