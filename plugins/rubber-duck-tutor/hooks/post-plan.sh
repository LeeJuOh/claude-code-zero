#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches ExitPlanMode)
#
# Fires when Claude exits plan mode. Suggests a duck plan review.
# No prompt-based filtering — if a plan was created, always suggest.
# Rate-limited. Silently exits in subagent contexts.

source "$(dirname "$0")/lib.sh"

duck__init
duck__check_rate_limit

cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] 🦆 A plan was just created. Suggest a duck plan review in one short sentence using the duck character. Example tone: '🦆 꽥 — 플랜 나왔네! 30초만 같이 볼래?' Stay in character as a curious, strategically naive duck. Do not start the session until they confirm. If they decline, do not offer again. If another plugin has already suggested a review, skip silently."}}
HOOK_JSON

exit 0
