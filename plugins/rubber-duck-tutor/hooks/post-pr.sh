#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches Bash with gh pr / glab mr create filter)
#
# Fires after Bash tool use filtered by `if: Bash(gh pr create*)` / `if: Bash(glab mr create*)`.
# Inline regex defends against compound commands.
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
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] A PR/MR was just created. In one short sentence, suggest the user type `/branch` then `/duck review` to review without interrupting their current work. Stay in duck character. If they decline, do not offer again. If another plugin has already suggested a review, skip silently."}}
HOOK_JSON

exit 0
