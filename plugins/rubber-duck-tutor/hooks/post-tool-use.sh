#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches Bash tool)
#
# Fires after every Bash tool use. Detects git commit commands and
# suggests a duck session. Rate-limited to 2 suggestions per session.
# Silently exits in subagent contexts.

source "$(dirname "$0")/lib.sh"

duck__init

# Only trigger on git commit commands (check BEFORE rate limit so
# non-commit Bash calls don't consume offer slots)
COMMAND=$(duck__get '.tool_input.command')
if ! echo "$COMMAND" | grep -qE '^\s*git\s+commit'; then
  exit 0
fi

duck__check_rate_limit

cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] The user just committed code. Offer a duck session ONLY if the commit involved: new files/modules, schema or data model changes, architecture decisions or significant refactors, unfamiliar patterns or libraries. Do NOT offer for: typos, formatting, config tweaks, dependency bumps, or trivial changes. If offering, use one short sentence — e.g. 'Quick duck check on that commit? 30 seconds.' Do not start the session until they confirm. If they decline, do not offer again this session."}}
HOOK_JSON

exit 0
