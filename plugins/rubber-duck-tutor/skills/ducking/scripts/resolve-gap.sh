#!/usr/bin/env bash
# duck: mark a previously logged gap as resolved so it stops being retrieved.
#
# Usage: resolve-gap.sh "<gap text>"
#
# Called after the user demonstrates, during a retrieval confrontation (S13),
# that they can now explain a gap that was previously logged as shaky. Rewrites
# ${CLAUDE_PLUGIN_DATA}/gaps.log in place, flipping "resolved":true on every
# line matching the current repo + the exact gap text (same argument
# convention as log-gap.sh -- pass the identical gap sentence).
#
# Malformed lines are left untouched byte-for-byte rather than dropped or
# reserialized -- resolving a gap should never be the operation that corrupts
# an unrelated line. Silent no-op on missing gap text, missing log, or missing
# jq: this is best-effort bookkeeping, never something that should surface an
# error mid-conversation or block the ship-point confrontation it's called from.

set -uo pipefail

GAP="${1:-}"
[[ -z "$GAP" ]] && exit 0

DATA_DIR="${CLAUDE_PLUGIN_DATA:-${HOME}/.claude/data/rubber-duck-tutor}"
LOG_FILE="$DATA_DIR/gaps.log"
[[ -f "$LOG_FILE" ]] || exit 0

command -v jq &>/dev/null || exit 0

REPO=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

TMP_FILE=$(mktemp "${DATA_DIR}/gaps.log.XXXXXX" 2>/dev/null) || exit 0

if jq -rR --arg repo "$REPO" --arg gap "$GAP" '
    . as $line
    | (try fromjson catch null) as $obj
    | if $obj == null then $line
      elif ($obj.repo == $repo and $obj.gap == $gap) then ($obj + {resolved: true} | tojson)
      else $line
      end
  ' "$LOG_FILE" > "$TMP_FILE" 2>/dev/null; then
  mv "$TMP_FILE" "$LOG_FILE"
else
  rm -f "$TMP_FILE"
fi
