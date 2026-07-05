#!/usr/bin/env bash
# duck: print recent UNRESOLVED gaps for the current repo.
#
# Usage: recent-gaps.sh [count]
#   count: max gaps to print (default 5)
#
# Outputs one gap per line in the format:
#   YYYY-MM-DD <gap text>
# Returns nothing if no unresolved gaps exist — caller should treat empty as
# "no history" (duck-orient) or "nothing to retrieve, fall through to the next
# rung of the fallback ladder" (S13 ship-point retrieval confrontation).
#
# A gap counts as unresolved unless its line explicitly has "resolved":true --
# missing the field entirely (legacy lines logged before S13) is treated the
# same as false, so nothing pre-existing silently vanishes from rotation.
# See resolve-gap.sh for how a line flips to resolved.

set -uo pipefail

COUNT="${1:-5}"

DATA_DIR="${CLAUDE_PLUGIN_DATA:-${HOME}/.claude/data/rubber-duck-tutor}"
LOG_FILE="$DATA_DIR/gaps.log"

[[ -f "$LOG_FILE" ]] || exit 0

REPO=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# Filter to current repo, take last $COUNT, format as "date<TAB>gap"
if command -v jq &>/dev/null; then
  jq -rR --arg repo "$REPO" --argjson count "$COUNT" '
    select(. != "")
    | fromjson?
    | select(.repo == $repo)
    | select(.resolved != true)
    | "\(.ts[0:10])\t\(.gap)"
  ' "$LOG_FILE" | tail -n "$COUNT"
else
  # Regex fallback (best-effort): extract date + gap when repo matches and not resolved
  REPO_ESC=$(printf '%s' "$REPO" | sed 's/[][\.*^$(){}?+|/]/\\&/g')
  grep -E "\"repo\":\"${REPO_ESC}\"" "$LOG_FILE" 2>/dev/null \
    | grep -v '"resolved":true' \
    | sed -nE 's/.*"ts":"([0-9-]{10})[^"]*".*"gap":"([^"]*)".*/\1\t\2/p' \
    | tail -n "$COUNT"
fi
