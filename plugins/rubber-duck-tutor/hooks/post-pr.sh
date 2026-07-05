#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches Bash with gh pr / glab mr create filter)
#
# Fires after Bash tool use filtered by `if: Bash(gh pr create*)` / `if: Bash(glab mr create*)`.
# Inline regex defends against compound commands.
# Shares the "ship" rate-limit bucket (max 1/session) with post-push.sh — whichever
# of {git push, gh pr create, glab mr create} fires first wins for the session
# (ADR 0003 shared ship budget). Silently exits in subagent contexts.
#
# S10: the moment a confrontation actually fires (rate limit passed), this
# script appends a "fire" telemetry event directly -- deterministic, no model
# involvement. The model records the matching "outcome" event later, once it
# can see whether the user engaged (see additionalContext below).

source "$(dirname "$0")/lib.sh"

duck__init

duck__is_enabled || exit 0

# Detect PR/MR creation commands
COMMAND=$(duck__get '.tool_input.command')
if ! echo "$COMMAND" | grep -qE '(gh\s+pr\s+create|glab\s+mr\s+create)'; then
  exit 0
fi

duck__check_rate_limit "ship" 1

if [[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
  bash "${CLAUDE_PLUGIN_ROOT}/skills/ducking/scripts/log-telemetry.sh" fire pr question 2>/dev/null || true
fi

cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] A PR/MR was just created. Confront the user with one short, specific understanding question about the artifact-level change they just shipped — what it does or why, not a line-by-line code quiz — and end your message right after the question. Do not suggest running another command; this is an inline confrontation, not a session. Stay in duck character; it's non-blocking, so ask once and move on regardless of their answer. Exception: if this PR/MR covers a large or many-artifact change where one inline question can't do it justice, suggest `/branch` then `/duck-review` instead so a fuller review can happen without interrupting their flow. If another plugin has already suggested a review, skip silently. Once you see how the user responds -- a substantive answer, or them moving on to something else without addressing it -- log the outcome once, silently, without mentioning it to them: `bash ${CLAUDE_PLUGIN_ROOT}/skills/ducking/scripts/log-telemetry.sh outcome pr answered` or `... outcome pr ignored`."}}
HOOK_JSON

exit 0
