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
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] The user just committed code. Per the duck skill, consider whether this is a good moment to offer a quick duck session. If the committed work involved new files, schema changes, architectural decisions, refactors, or unfamiliar patterns, ask the user (one short sentence) if they'd like a quick review — e.g. 'Quick duck check on that commit? 30 seconds.' Do not start the session until they confirm. If they decline, do not offer again this session."}}
HOOK_JSON

exit 0
