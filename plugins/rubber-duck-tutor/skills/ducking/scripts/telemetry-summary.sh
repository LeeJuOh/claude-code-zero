#!/usr/bin/env bash
# duck: summarize confrontation telemetry over a trailing window.
#
# Usage: telemetry-summary.sh [days]
#   days: window size in days (default 30)
#
# Prints one line, e.g.: "Last 30 days: 5 fired, 3 answered, 1 ignored"
#
# Reads ${CLAUDE_PLUGIN_DATA}/telemetry.jsonl (written by log-telemetry.sh).
# Missing/unreadable log -> all-zero counts, not an error: absence of
# telemetry means "no confrontations yet", never a crash. Without jq, real
# date-window filtering isn't feasible, so this falls back to an all-time
# count labeled as such rather than silently mislabeling it as a windowed one.

set -uo pipefail

DAYS="${1:-30}"
DATA_DIR="${CLAUDE_PLUGIN_DATA:-${HOME}/.claude/data/rubber-duck-tutor}"
LOG_FILE="$DATA_DIR/telemetry.jsonl"

if [[ ! -f "$LOG_FILE" ]]; then
  printf 'Last %s days: 0 fired, 0 answered, 0 ignored\n' "$DAYS"
  exit 0
fi

if ! command -v jq &>/dev/null; then
  FIRED=$(grep -c '"event":"fire"' "$LOG_FILE" 2>/dev/null || echo 0)
  ANSWERED=$(grep -c '"event":"outcome".*"outcome":"answered"' "$LOG_FILE" 2>/dev/null || echo 0)
  IGNORED=$(grep -c '"event":"outcome".*"outcome":"ignored"' "$LOG_FILE" 2>/dev/null || echo 0)
  printf 'All-time (jq unavailable, cannot filter by date): %s fired, %s answered, %s ignored\n' \
    "${FIRED:-0}" "${ANSWERED:-0}" "${IGNORED:-0}"
  exit 0
fi

CUTOFF_EPOCH=$(date -u -d "-${DAYS} days" +%s 2>/dev/null || date -u -v-"${DAYS}"d +%s 2>/dev/null || echo 0)

COUNTS=$(
  jq -rR --argjson cutoff "$CUTOFF_EPOCH" '
    select(. != "")
    | fromjson?
    | select((.ts | strptime("%Y-%m-%dT%H:%M:%SZ") | mktime) >= $cutoff)
  ' "$LOG_FILE" 2>/dev/null \
  | jq -s -r '
    "\([.[] | select(.event=="fire")] | length) \([.[] | select(.event=="outcome" and .outcome=="answered")] | length) \([.[] | select(.event=="outcome" and .outcome=="ignored")] | length)"
  ' 2>/dev/null
)

read -r FIRED ANSWERED IGNORED <<< "$COUNTS"

printf 'Last %s days: %s fired, %s answered, %s ignored\n' "$DAYS" "${FIRED:-0}" "${ANSWERED:-0}" "${IGNORED:-0}"
