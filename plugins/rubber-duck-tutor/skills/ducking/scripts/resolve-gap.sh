#!/usr/bin/env bash
# duck: mark a previously logged gap as resolved so it stops being retrieved.
#
# Usage: resolve-gap.sh --data-dir <dir> "<gap text>"
# --data-dir (absolute) is required: the Bash tool has no CLAUDE_PLUGIN_DATA, or
# another plugin's, so callers pass the path -- SKILL.md substitutes it, hooks
# export it. A relative value would drop files into the user's repo.
#
# Called after the user demonstrates, during a retrieval confrontation (S13),
# that they can now explain a gap that was previously logged as shaky. Rewrites
# <dir>/gaps.log in place, flipping "resolved":true on every
# line matching the current repo + the exact gap text (same argument
# convention as log-gap.sh -- pass the identical gap sentence). A line copied
# straight from recent-gaps.sh works too: its leading "YYYY-MM-DD<TAB>" is
# dropped first, since callers kept passing it and matching nothing.
#
# Malformed lines are left untouched byte-for-byte rather than dropped or
# reserialized -- resolving a gap should never be the operation that corrupts
# an unrelated line. Silent no-op on missing gap text, missing log, or missing
# jq: this is best-effort bookkeeping, never something that should surface an
# error mid-conversation or block the ship-point confrontation it's called from.

set -uo pipefail

[[ "${1:-}" == "--data-dir" && ( "${2:-}" == /* || "${2:-}" == [A-Za-z]:* ) ]] || { echo "resolve-gap: usage: resolve-gap.sh --data-dir <dir> \"<gap text>\"" >&2; exit 2; }
DATA_DIR="$2"; shift 2

GAP="${1:-}"
DATE_PREFIX=$'^[0-9]{4}-[0-9]{2}-[0-9]{2}\t(.*)$'
[[ "$GAP" =~ $DATE_PREFIX ]] && GAP="${BASH_REMATCH[1]}"
[[ -z "$GAP" ]] && exit 0

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
