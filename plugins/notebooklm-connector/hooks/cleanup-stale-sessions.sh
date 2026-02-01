#!/bin/bash
# SessionStart hook: Delete session files older than 24 hours
SESSIONS_DIR="${CLAUDE_PLUGIN_ROOT}/skills/notebooklm-manager/data/sessions"

if [ -d "$SESSIONS_DIR" ]; then
  find "$SESSIONS_DIR" -name "*.json" -type f -mtime +0 -delete 2>/dev/null || true
fi
exit 0
