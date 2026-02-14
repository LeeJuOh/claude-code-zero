#!/bin/bash
# PostToolUse hook — coverage analysis reminder after chrome-mcp-query completes.

INPUT=$(cat)

SUBAGENT_TYPE=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')
if [[ "$SUBAGENT_TYPE" != *"chrome-mcp-query"* ]]; then
  exit 0
fi

cat << 'EOF'
{
  "decision": "block",
  "reason": "COVERAGE_REMINDER: Before presenting the answer, perform coverage analysis per SKILL.md Section 5 (STEP A→B→C→D)."
}
EOF
