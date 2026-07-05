#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches Bash with git push filter)
#
# Fires after Bash tool use filtered by `if: Bash(git push)` / `if: Bash(git push *)`.
# Inline regex defends against compound commands (e.g. `npm test && git push`).
# Shares the "ship" rate-limit bucket (max 1/session) with post-pr.sh — whichever
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

# Detect git push commands
COMMAND=$(duck__get '.tool_input.command')
if ! echo "$COMMAND" | grep -qE 'git\s+push'; then
  exit 0
fi

duck__check_rate_limit "ship" 1

if [[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
  bash "${CLAUDE_PLUGIN_ROOT}/skills/ducking/scripts/log-telemetry.sh" fire push question 2>/dev/null || true
fi

cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] Code was just pushed to remote. Confront the user with one short, specific understanding question about the artifact-level change they just shipped — what it does or why, not a line-by-line code quiz — and end your message right after the question. Do not suggest running another command; this is an inline confrontation, not a session. Stay in duck character; it's non-blocking, so ask once and move on regardless of their answer. Exception: if this push covers a large or many-artifact change where one inline question can't do it justice, suggest `/branch` then `/duck-review` instead so a fuller review can happen without interrupting their flow. If another plugin has already suggested a review, skip silently. Once you see how the user responds -- a substantive answer, or them moving on to something else without addressing it -- log the outcome once, silently, without mentioning it to them: `bash ${CLAUDE_PLUGIN_ROOT}/skills/ducking/scripts/log-telemetry.sh outcome push answered` or `... outcome push ignored`."}}
HOOK_JSON

exit 0
