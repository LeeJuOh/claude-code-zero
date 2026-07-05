#!/usr/bin/env bash
# duck: print recent gaps for the current repo.
#
# Usage: recent-gaps.sh [count]
#   count: max gaps to print (default 5)
#
# Outputs one gap per line in the format:
#   YYYY-MM-DD <gap text>
# Returns nothing if no gaps logged yet — caller should treat empty as "no history".

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
    | "\(.ts[0:10])\t\(.gap)"
  ' "$LOG_FILE" | tail -n "$COUNT"
else
  # Regex fallback (best-effort): extract date + gap when repo matches
  REPO_ESC=$(printf '%s' "$REPO" | sed 's/[][\.*^$(){}?+|/]/\\&/g')
  grep -E "\"repo\":\"${REPO_ESC}\"" "$LOG_FILE" 2>/dev/null \
    | sed -nE 's/.*"ts":"([0-9-]{10})[^"]*".*"gap":"([^"]*)".*/\1\t\2/p' \
    | tail -n "$COUNT"
fi
