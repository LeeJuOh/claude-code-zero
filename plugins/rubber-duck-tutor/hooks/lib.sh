#!/usr/bin/env bash
# rubber-duck-tutor: shared hook library
#
# Provides: stdin reading with timeout, subagent detection,
# JSON field extraction, and session rate limiting.
#
# Usage from hook scripts:
#   source "$(dirname "$0")/lib.sh"
#   duck__init              # reads stdin, exits if subagent
#   duck__check_rate_limit  # exits if over 2 offers this session

set -uo pipefail

# --- stdin with timeout ---

duck__read_stdin() {
  local buf=""
  while IFS= read -r -t 3 line; do
    buf="${buf}${line}"
  done
  echo "$buf"
}

# --- JSON field extraction (no jq dependency) ---

duck__extract_field() {
  echo "$1" | grep -oE "\"$2\" *: *\"[^\"]*\"" | head -1 | sed "s/\"$2\" *: *\"//;s/\"$//"
}

# --- Globals set by duck__init ---

DUCK_INPUT=""
DUCK_SESSION_ID=""

duck__init() {
  DUCK_INPUT=$(duck__read_stdin)

  # Empty input (timeout or pipe error) — bail silently
  if [[ -z "$DUCK_INPUT" ]]; then
    exit 0
  fi

  # Subagent detection: agent_type field exists → not the user's session
  local agent_type
  agent_type=$(duck__extract_field "$DUCK_INPUT" "agent_type")
  if [[ -n "$agent_type" ]]; then
    exit 0
  fi

  # Extract session ID for rate limiting
  DUCK_SESSION_ID=$(duck__extract_field "$DUCK_INPUT" "session_id")
  if [[ -z "$DUCK_SESSION_ID" ]]; then
    exit 0
  fi
}

# --- Session rate limiting (shared across all hook triggers) ---

DUCK_MAX_OFFERS=2

duck__check_rate_limit() {
  local state_dir="${CLAUDE_PLUGIN_DATA:-${TMPDIR:-/tmp}}/sessions"
  mkdir -p "$state_dir"

  # Clean up state files older than 24 hours
  find "$state_dir" -name "duck_auto_*.state" -mtime +0 -delete 2>/dev/null || true

  local safe_id="${DUCK_SESSION_ID//[^a-zA-Z0-9_-]/_}"
  local state_file="${state_dir}/duck_auto_${safe_id}.state"

  local offers=0
  if [[ -f "$state_file" ]]; then
    offers=$(cat "$state_file" 2>/dev/null || echo 0)
  fi

  if [[ "$offers" -ge "$DUCK_MAX_OFFERS" ]]; then
    exit 0
  fi

  echo $(( offers + 1 )) > "$state_file"
}
