#!/usr/bin/env bash
# duck: append a session-end gap to the persistent gap log.
#
# Usage: log-gap.sh --data-dir <dir> "<gap text>"
# --data-dir (absolute) is required: the Bash tool has no CLAUDE_PLUGIN_DATA, or
# another plugin's, so callers pass the path -- SKILL.md substitutes it, hooks
# export it. A relative value would drop files into the user's repo.
#
# Writes one JSON line per gap to <dir>/gaps.log keyed by
# repo path so /duck orient and ship-point confrontation can pull unresolved
# gaps for spaced retrieval (S13). Every new line is written with
# "resolved":false explicitly -- see resolve-gap.sh for how a gap flips to
# true once the user re-explains it.
# Silent on success, prints to stderr on failure.

set -uo pipefail

[[ "${1:-}" == "--data-dir" && ( "${2:-}" == /* || "${2:-}" == [A-Za-z]:* ) ]] || { echo "log-gap: usage: log-gap.sh --data-dir <dir> \"<gap text>\"" >&2; exit 2; }
DATA_DIR="$2"; shift 2

GAP="${1:-}"
if [[ -z "$GAP" ]]; then
  echo "log-gap: empty gap text, nothing to log" >&2
  exit 0
fi

mkdir -p "$DATA_DIR" || { echo "log-gap: cannot create $DATA_DIR" >&2; exit 0; }

LOG_FILE="$DATA_DIR/gaps.log"
REPO=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Escape quotes/backslashes/newlines for JSON
escape_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

REPO_ESC=$(escape_json "$REPO")
GAP_ESC=$(escape_json "$GAP")

printf '{"ts":"%s","repo":"%s","gap":"%s","resolved":false}\n' "$TS" "$REPO_ESC" "$GAP_ESC" >> "$LOG_FILE"
