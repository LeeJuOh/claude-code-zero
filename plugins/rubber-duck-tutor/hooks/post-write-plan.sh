#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches Write)
#
# Fires after Write tool use. Checks if the written file is a markdown
# document that could be a plan or spec. Uses deterministic filtering
# only (extension check, known-skip list). No prompt-based judgment.
# Rate-limited. Silently exits in subagent contexts.

source "$(dirname "$0")/lib.sh"

duck__init

# Only trigger for .md files
FILE_PATH=$(duck__get '.tool_input.file_path')
if [[ -z "$FILE_PATH" ]] || [[ "$FILE_PATH" != *.md ]]; then
  exit 0
fi

# Skip known non-plan markdown files (deterministic filter)
BASENAME=$(basename "$FILE_PATH" | tr '[:upper:]' '[:lower:]')
case "$BASENAME" in
  readme.md|changelog.md|contributing.md|license.md|code_of_conduct.md|\
  security.md|agents.md|claude.md|gemini.md|memory.md|skill.md)
    exit 0
    ;;
esac

duck__check_rate_limit

cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] 🦆 A markdown document was just written that may be a plan or spec. Suggest a duck review in one short sentence using the duck character. Example tone: '🦆 꽥 — 문서 하나 나왔는데, 같이 한번 볼래?' Stay in character as a curious, strategically naive duck. Do not start the session until they confirm. If they decline, do not offer again. If another plugin has already suggested a review, skip silently."}}
HOOK_JSON

exit 0
