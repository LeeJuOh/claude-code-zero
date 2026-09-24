#!/usr/bin/env bash
# duck: append a confrontation telemetry event to the persistent log.
#
# Usage:
#   log-telemetry.sh --data-dir <dir> fire <trigger> [mode]
#   log-telemetry.sh --data-dir <dir> outcome <trigger> <answered|ignored>
#
# Writes one JSON line per event to <dir>/telemetry.jsonl, so
# telemetry-summary.sh (surfaced by duck-orient) can answer "is this plugin
# actually doing anything?" A "fire" and its later "outcome" are NOT paired by
# ID -- they're independent counters (fired / answered / ignored) rather than
# a ledger that must reconcile, which keeps this append-only and crash-safe
# the same way gaps.log is (S4/S8): a torn write only costs one line, never
# the whole file.
#
# Fire events are appended directly by the ship hooks (post-push.sh,
# post-pr.sh) the moment a confrontation actually fires -- deterministic, zero
# model involvement. Outcome events are appended later in the same
# conversation once the model can judge whether the user engaged with the
# question or moved on -- the one place in this flow where that judgment is
# unavoidable (S10).
#
# Silent on success, prints to stderr and exits 0 on failure -- telemetry must
# never break or block a confrontation.
#
# --data-dir (absolute) is required: the Bash tool has no CLAUDE_PLUGIN_DATA, or
# another plugin's, so callers pass the path -- SKILL.md substitutes it, hooks
# export it. A relative value would drop files into the user's repo.

set -uo pipefail

[[ "${1:-}" == "--data-dir" && ( "${2:-}" == /* || "${2:-}" == [A-Za-z]:* ) ]] || { echo "log-telemetry: usage: log-telemetry.sh --data-dir <dir> fire|outcome ..." >&2; exit 2; }
DATA_DIR="$2"; shift 2

EVENT="${1:-}"
LOG_FILE="$DATA_DIR/telemetry.jsonl"
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

case "$EVENT" in
  fire)
    TRIGGER="${2:-}"
    MODE="${3:-question}"
    if [[ -z "$TRIGGER" ]]; then
      echo "log-telemetry: fire requires a trigger" >&2
      exit 0
    fi
    LINE=$(printf '{"ts":"%s","event":"fire","trigger":"%s","mode":"%s"}' "$TS" "$TRIGGER" "$MODE")
    ;;
  outcome)
    TRIGGER="${2:-}"
    OUTCOME="${3:-}"
    if [[ -z "$TRIGGER" ]] || { [[ "$OUTCOME" != "answered" ]] && [[ "$OUTCOME" != "ignored" ]]; }; then
      echo "log-telemetry: outcome requires a trigger and answered|ignored" >&2
      exit 0
    fi
    LINE=$(printf '{"ts":"%s","event":"outcome","trigger":"%s","outcome":"%s"}' "$TS" "$TRIGGER" "$OUTCOME")
    ;;
  *)
    echo "log-telemetry: usage: log-telemetry.sh --data-dir <dir> fire <trigger> [mode] | outcome <trigger> <answered|ignored>" >&2
    exit 0
    ;;
esac

mkdir -p "$DATA_DIR" 2>/dev/null || { echo "log-telemetry: cannot create $DATA_DIR" >&2; exit 0; }
printf '%s\n' "$LINE" >> "$LOG_FILE" 2>/dev/null || echo "log-telemetry: cannot write $LOG_FILE" >&2
exit 0
