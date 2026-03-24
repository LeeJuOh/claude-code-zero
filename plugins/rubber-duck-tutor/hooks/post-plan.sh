#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches ExitPlanMode)
#
# Fires when Claude exits plan mode. Suggests a duck plan review
# so the user doesn't rubber-stamp the plan without engaging.
# Shares rate limit with post-tool-use.sh (2 total offers per session).

INPUT=$(cat)

# Extract session_id for rate limiting
SESSION_ID=$(echo "$INPUT" | grep -oE '"session_id" *: *"[^"]*"' | head -1 | sed 's/"session_id" *: *"//;s/"$//')

if [[ -z "$SESSION_ID" ]]; then
  exit 0
fi

# Shared session state with post-tool-use.sh
STATE_DIR="${CLAUDE_PLUGIN_DATA:-${TMPDIR:-/tmp}}/sessions"
mkdir -p "$STATE_DIR"
STATE_FILE="${STATE_DIR}/duck_auto_${SESSION_ID//[^a-zA-Z0-9_-]/_}.state"

offers=0
if [[ -f "$STATE_FILE" ]]; then
  offers=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
fi

# Stop after 2 offers per session (shared across all triggers)
if [[ "$offers" -ge 2 ]]; then
  exit 0
fi

echo $(( offers + 1 )) > "$STATE_FILE"

cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] A plan was just created. This is the #1 rubber-stamping risk — users often approve plans without engaging deeply. Ask the user (one short sentence) if they'd like a quick duck plan review — e.g. 'Duck check on this plan before we go? 30 seconds.' Do not start the session until they confirm. If they decline, do not offer again this session."}}
HOOK_JSON

exit 0
