#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches Bash with git push filter)
#
# Fires after Bash tool use filtered by `if: Bash(git push)` / `if: Bash(git push *)`.
# Inline regex defends against compound commands (e.g. `npm test && git push`).
# Rate-limited. Silently exits in subagent contexts.

source "$(dirname "$0")/lib.sh"

duck__init

# Detect git push commands
COMMAND=$(duck__get '.tool_input.command')
if ! echo "$COMMAND" | grep -qE 'git\s+push'; then
  exit 0
fi

duck__check_rate_limit

cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] Code was just pushed to remote. In one short sentence, suggest the user type `/branch` then `/duck-review` to review without interrupting their current work. Stay in duck character. If they decline, do not offer again. If another plugin has already suggested a review, skip silently."}}
HOOK_JSON

exit 0
