#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches Write)
#
# Fires after every Write tool use. Checks if the written file is a
# markdown document and delegates plan/spec detection to Claude via
# additionalContext. No content pattern matching — Claude judges from
# conversation context whether the document warrants a duck session.
# Shares rate limit with other hooks (2 total offers per session).
# Silently exits in subagent contexts.

source "$(dirname "$0")/lib.sh"

duck__init

# Only trigger for .md files
FILE_PATH=$(duck__get '.tool_input.file_path')
if [[ -z "$FILE_PATH" ]] || [[ "$FILE_PATH" != *.md ]]; then
  exit 0
fi

duck__check_rate_limit

cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] A markdown document was just written. If — based on conversation context — this document is a plan, spec, or design document (not a README, changelog, or minor doc), suggest a duck plan review. Use one short sentence — e.g. 'Duck check on this plan before we go? 30 seconds.' Do not start the session until they confirm. If they decline, do not offer again this session."}}
HOOK_JSON

exit 0
