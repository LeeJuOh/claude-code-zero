#!/bin/bash
# NotebookLM Query Proxy Hook
# Detects keywords in Plan Mode and invokes skill via independent process
#
# This hook enables NotebookLM queries in Plan Mode where Chrome MCP tools
# are normally unavailable due to read-only restrictions.

set -euo pipefail

# Read JSON input from stdin
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')
PERMISSION_MODE=$(echo "$INPUT" | jq -r '.permission_mode // "default"')

# Detect keywords (case-insensitive)
HAS_KEYWORD=false
if echo "$PROMPT" | grep -iE "(notebook|노트북|notebooklm)" > /dev/null 2>&1; then
  HAS_KEYWORD=true
fi
if echo "$PROMPT" | grep -qE "notebooklm\.google\.com/notebook/" 2>/dev/null; then
  HAS_KEYWORD=true
fi

# Pass through if no keyword detected
if [ "$HAS_KEYWORD" = "false" ]; then
  exit 0
fi

# Pass through in Normal Mode (skill handles directly)
if [ "$PERMISSION_MODE" != "plan" ]; then
  exit 0
fi

# Plan Mode + keyword detected → Invoke skill via independent process
# Explicitly list Chrome MCP tools
CHROME_TOOLS="mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__form_input,mcp__claude-in-chrome__javascript_tool"

RESULT=$(claude -p "/notebooklm-manager $PROMPT" \
  --chrome \
  --plugin-dir "${CLAUDE_PLUGIN_ROOT}" \
  --allowedTools "$CHROME_TOOLS" \
  --max-turns 15 \
  --output-format text \
  2>/dev/null) || RESULT="[Error] Failed to query NotebookLM. Ensure Chrome is connected and claude-in-chrome extension is active."

# Return result as additionalContext (JSON escaped)
ESCAPED_RESULT=$(echo "$RESULT" | jq -Rs .)

cat << EOF
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":$ESCAPED_RESULT}}
EOF

exit 0
