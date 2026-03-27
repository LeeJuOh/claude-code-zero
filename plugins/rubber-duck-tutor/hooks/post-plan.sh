#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches ExitPlanMode)
#
# Fires when Claude exits plan mode. Suggests a duck plan review
# so the user doesn't rubber-stamp the plan without engaging.
# Shares rate limit with other hooks (2 total offers per session).
# Silently exits in subagent contexts.

source "$(dirname "$0")/lib.sh"

duck__init
duck__check_rate_limit

cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] A plan was just created. This is the #1 rubber-stamping risk — users often approve plans without engaging deeply. Only suggest a duck session if the plan contains substantive decisions (architecture choices, scope trade-offs, technology selection) — skip for trivial plans (single-file edits, minor config changes, straightforward bug fixes). IMPORTANT: If another plugin has already suggested a plan review or learning exercise in this response, do NOT add a duplicate suggestion — skip silently. If offering, use one short sentence — e.g. 'Duck check on this plan before we go? 30 seconds.' Do not start the session until they confirm. If they decline, do not offer again this session."}}
HOOK_JSON

exit 0
