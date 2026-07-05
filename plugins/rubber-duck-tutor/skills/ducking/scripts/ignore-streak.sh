#!/usr/bin/env bash
# duck: compute the current consecutive-ignore streak from telemetry.
#
# Usage: ignore-streak.sh
#
# Prints a single integer: how many "outcome" events in a row, scanning
# backwards from the most recent, came back "ignored" before hitting the
# first "answered" (or running out of log). This is deliberately a
# cross-session counter, not a per-session one: the shared ship budget (ADR
# 0003) allows only one ship-point confrontation per session, so "3 in a
# row" necessarily spans the last 3 sessions where one fired -- exactly the
# habituation signal S12 wants to catch (see log-telemetry.sh for the fire/
# outcome event shapes this reads).
#
# Deterministic, shell-only -- no model judgment, no transcript parsing.
# Missing/unreadable log or no jq -> 0. That default keeps the caller in
# question mode (the less disruptive of the two ship-point modes), so a
# telemetry hiccup degrades toward "ask like normal", never toward "assume
# fatigue that isn't there."

set -uo pipefail

DATA_DIR="${CLAUDE_PLUGIN_DATA:-${HOME}/.claude/data/rubber-duck-tutor}"
LOG_FILE="$DATA_DIR/telemetry.jsonl"

if [[ ! -f "$LOG_FILE" ]] || ! command -v jq &>/dev/null; then
  echo 0
  exit 0
fi

jq -rR '
  fromjson? | select(.event == "outcome") | .outcome
' "$LOG_FILE" 2>/dev/null | awk '
  { lines[NR] = $0 }
  END {
    streak = 0
    for (i = NR; i >= 1; i--) {
      if (lines[i] == "ignored") { streak++ } else { break }
    }
    print streak
  }
'
