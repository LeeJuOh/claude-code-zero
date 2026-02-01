#!/bin/bash
# SessionEnd hook: Delete current session file
SESSION_ID=$(jq -r '.session_id' < /dev/stdin)
SESSIONS_DIR="${CLAUDE_PLUGIN_ROOT}/skills/notebooklm-manager/data/sessions"

if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" != "null" ] && [ -d "$SESSIONS_DIR" ]; then
  rm -f "$SESSIONS_DIR/${SESSION_ID}.json"
fi
exit 0
