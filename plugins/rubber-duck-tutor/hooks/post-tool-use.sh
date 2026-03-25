#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches Bash tool)
#
# Fires after every Bash tool use. Detects git commit commands and
# suggests a duck session. Rate-limited to 2 suggestions per session.

INPUT=$(cat)

# Only trigger on git commit commands (extract command field, match "git commit" at start)
COMMAND=$(echo "$INPUT" | grep -oE '"command" *: *"[^"]*"' | head -1 | sed 's/"command" *: *"//;s/"$//')
if ! echo "$COMMAND" | grep -qE '^\s*git\s+commit'; then
  exit 0
fi

# Extract session_id for rate limiting (allow optional whitespace around colon)
SESSION_ID=$(echo "$INPUT" | grep -oE '"session_id" *: *"[^"]*"' | head -1 | sed 's/"session_id" *: *"//;s/"$//')

if [[ -z "$SESSION_ID" ]]; then
  exit 0
fi

# Session state: track offers
STATE_DIR="${CLAUDE_PLUGIN_DATA:-${TMPDIR:-/tmp}}/sessions"
mkdir -p "$STATE_DIR"

# Clean up state files older than 24 hours
find "$STATE_DIR" -name "duck_auto_*.state" -mtime +0 -delete 2>/dev/null || true
STATE_FILE="${STATE_DIR}/duck_auto_${SESSION_ID//[^a-zA-Z0-9_-]/_}.state"

offers=0
if [[ -f "$STATE_FILE" ]]; then
  offers=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
fi

# Stop after 2 offers per session
if [[ "$offers" -ge 2 ]]; then
  exit 0
fi

echo $(( offers + 1 )) > "$STATE_FILE"

cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] The user just committed code. Offer a duck session ONLY if the commit involved: new files/modules, schema or data model changes, architecture decisions or significant refactors, unfamiliar patterns or libraries. Do NOT offer for: typos, formatting, config tweaks, dependency bumps, or trivial changes. If offering, use one short sentence — e.g. 'Quick duck check on that commit? 30 seconds.' Do not start the session until they confirm. If they decline, do not offer again this session."}}
HOOK_JSON

exit 0
