#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches Write)
#
# Fires after Write tool use. Checks if the written file's basename matches
# a plan/spec/design pattern (plan*, spec*, design*, rfc*, adr*). Uses
# deterministic filtering only — positive filename match plus a skip list
# for common doc files that could share keywords (e.g. claude.md). No
# prompt-based judgment. Rate-limited. Silently exits in subagent contexts.

source "$(dirname "$0")/lib.sh"

duck__init

# Only trigger for .md files
FILE_PATH=$(duck__get '.tool_input.file_path')
if [[ -z "$FILE_PATH" ]] || [[ "$FILE_PATH" != *.md ]]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH" | tr '[:upper:]' '[:lower:]')

# Skip known non-plan markdown files (deterministic filter)
case "$BASENAME" in
  readme.md|changelog.md|contributing.md|license.md|code_of_conduct.md|\
  security.md|agents.md|claude.md|gemini.md|memory.md|skill.md)
    exit 0
    ;;
esac

# Positive match: only trigger on plan/spec/design/rfc/adr basenames.
# Pattern allows separators (hyphen, underscore, dot, digit) after the prefix
# so files like plan.md, spec-2024.md, design_v2.md, rfc-001.md all match.
case "$BASENAME" in
  plan*.md|spec*.md|design*.md|rfc*.md|adr*.md)
    ;;
  *)
    exit 0
    ;;
esac

duck__check_rate_limit

cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] A markdown document was just written that may be a plan or spec. In one short sentence, suggest the user type `/branch` then `/duck-plan` to review without interrupting their current work. Stay in duck character. If they decline, do not offer again. If another plugin has already suggested a review, skip silently."}}
HOOK_JSON

exit 0
