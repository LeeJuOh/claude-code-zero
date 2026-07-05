#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches Write)
#
# Fires after Write tool use. Matches on PATH first — docs/adr/, docs/plan(s)/,
# docs/spec(s)/, docs/rfc(s)/ — so numbered ADRs (docs/adr/0003-foo.md) match
# even though the filename itself carries no plan/spec/design keyword. Falls
# back to the old basename-prefix match (plan*.md, spec*.md, ...) for repos
# that don't nest docs under docs/. A skip list guards common doc files that
# could share keywords (e.g. claude.md). No prompt-based judgment.
# Rate-limited. Silently exits in subagent contexts.
#
# The path regex is overridable via ${CLAUDE_PLUGIN_DATA}/config.json's
# `docTriggerPathRegex` key. A malformed override (fails to compile) falls
# back to the default set rather than silently disabling the trigger.

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

# --- Path-based match (primary) ---
DEFAULT_PATH_REGEX='(^|/)docs/(adr|plans?|specs?|rfcs?)/'
PATH_REGEX="$DEFAULT_PATH_REGEX"

OVERRIDE=$(duck__config_get 'docTriggerPathRegex')
if [[ -n "$OVERRIDE" ]]; then
  # Validate the override compiles before trusting it (footgun guard):
  # grep exits 2 on a malformed ERE, 0/1 on a valid one regardless of match.
  grep -qE "$OVERRIDE" <<<"" 2>/dev/null
  if [[ $? -ne 2 ]]; then
    PATH_REGEX="$OVERRIDE"
  fi
fi

MATCHED=0
if grep -qE "$PATH_REGEX" <<<"$FILE_PATH" 2>/dev/null; then
  MATCHED=1
else
  # --- Filename fallback (secondary) ---
  # Pattern allows separators (hyphen, underscore, dot, digit) after the
  # prefix so files like plan.md, spec-2024.md, design_v2.md, rfc-001.md
  # all match even outside a docs/ tree.
  case "$BASENAME" in
    plan*.md|spec*.md|design*.md|rfc*.md|adr*.md)
      MATCHED=1
      ;;
  esac
fi

if [[ "$MATCHED" -eq 0 ]]; then
  exit 0
fi

duck__check_rate_limit

cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] A markdown document was just written that may be a plan or spec. In one short sentence, suggest the user type `/branch` then `/duck-prebuild` to review without interrupting their current work. Stay in duck character. If they decline, do not offer again. If another plugin has already suggested a review, skip silently."}}
HOOK_JSON

exit 0
