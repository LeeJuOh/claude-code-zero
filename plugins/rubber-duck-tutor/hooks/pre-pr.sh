#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches Bash with gh/glab filter)
#
# Fires after Bash tool use filtered by `if: Bash(gh *)` / `if: Bash(glab *)`.
# Detects PR/MR creation commands and suggests a duck review session.
# Rate-limited. Silently exits in subagent contexts.

source "$(dirname "$0")/lib.sh"

duck__init

# Detect PR/MR creation commands
COMMAND=$(duck__get '.tool_input.command')
if ! echo "$COMMAND" | grep -qE '(gh\s+pr\s+create|glab\s+mr\s+create)'; then
  exit 0
fi

duck__check_rate_limit

cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] 🦆 The user is about to create a PR/MR. Before proceeding, suggest a duck review in one short sentence using the duck character. Example tone: '🦆 꽥 — PR 올리기 전에 30초만 같이 볼래?' Stay in character as a curious, strategically naive duck. Do not start the session until they confirm. If they decline, do not offer again. If another plugin has already suggested a review, skip silently."}}
HOOK_JSON

exit 0
