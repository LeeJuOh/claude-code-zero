#!/usr/bin/env bash
# duck: append a session-end gap to the persistent gap log.
#
# Usage: log-gap.sh "<gap text>"
#
# Writes one JSON line per gap to ${CLAUDE_PLUGIN_DATA}/gaps.log keyed by
# repo path so /duck orient can pull recent gaps for spaced retrieval.
# Silent on success, prints to stderr on failure.

set -uo pipefail

GAP="${1:-}"
if [[ -z "$GAP" ]]; then
  echo "log-gap: empty gap text, nothing to log" >&2
  exit 0
fi

DATA_DIR="${CLAUDE_PLUGIN_DATA:-${HOME}/.claude/data/rubber-duck-tutor}"
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

printf '{"ts":"%s","repo":"%s","gap":"%s"}\n' "$TS" "$REPO_ESC" "$GAP_ESC" >> "$LOG_FILE"
