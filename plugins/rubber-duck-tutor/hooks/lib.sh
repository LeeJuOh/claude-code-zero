#!/usr/bin/env bash
# rubber-duck-tutor: shared hook library
#
# Provides: stdin reading, subagent detection, JSON field extraction,
# and session rate limiting.
#
# Usage from hook scripts:
#   source "$(dirname "$0")/lib.sh"
#   duck__init                          # reads stdin, exits if subagent
#   duck__check_rate_limit              # default bucket, exits if over 2 offers this session
#   duck__check_rate_limit "ship" 1     # named bucket + cap, e.g. shared ship budget

set -uo pipefail

# --- JSON field extraction ---
# Use jq if available (robust), fall back to regex (fragile but zero-dep)

if command -v jq &>/dev/null; then
  duck__get() {
    echo "$DUCK_INPUT" | jq -r "$1 // empty"
  }
else
  duck__get() {
    # Fallback: regex for simple string fields only.
    # Supports .field and .parent.field (extracts leaf field name).
    local field="${1##*.}"
    echo "$DUCK_INPUT" | grep -oE "\"$field\" *: *\"[^\"]*\"" | head -1 | sed "s/\"$field\" *: *\"//;s/\"$//"
  }
fi

# --- Globals set by duck__init ---

DUCK_INPUT=""
DUCK_SESSION_ID=""

duck__init() {
  DUCK_INPUT=$(cat)

  # Empty input (pipe error) — bail silently
  if [[ -z "$DUCK_INPUT" ]]; then
    exit 0
  fi

  # Subagent detection: agent_type field exists → not the user's session
  local agent_type
  agent_type=$(duck__get '.agent_type')
  if [[ -n "$agent_type" ]]; then
    exit 0
  fi

  # Extract session ID for rate limiting
  DUCK_SESSION_ID=$(duck__get '.session_id')
  if [[ -z "$DUCK_SESSION_ID" ]]; then
    exit 0
  fi
}

# --- Session rate limiting ---
# Bucketed per caller: the default bucket covers the plan/spec-doc triggers
# (post-plan.sh, post-write-plan.sh); the "ship" bucket is the shared budget
# for {git push, gh pr create, glab mr create} (ADR 0003) — kept separate so
# ship-point confrontation isn't starved by plan suggestions already having
# used up the shared counter.

DUCK_MAX_OFFERS=2

duck__check_rate_limit() {
  local bucket="${1:-default}"
  local max="${2:-$DUCK_MAX_OFFERS}"

  local state_dir="${CLAUDE_PLUGIN_DATA:-${TMPDIR:-/tmp}}/sessions"
  mkdir -p "$state_dir"

  # Clean up state files older than 24 hours
  find "$state_dir" -name "duck_auto_*.state" -mtime +0 -delete 2>/dev/null || true

  local safe_id="${DUCK_SESSION_ID//[^a-zA-Z0-9_-]/_}"
  local state_file="${state_dir}/duck_auto_${bucket}_${safe_id}.state"

  local offers=0
  if [[ -f "$state_file" ]]; then
    offers=$(cat "$state_file" 2>/dev/null || echo 0)
  fi

  if [[ "$offers" -ge "$max" ]]; then
    exit 0
  fi

  echo $(( offers + 1 )) > "$state_file"
}

# --- Config file access (${CLAUDE_PLUGIN_DATA}/config.json) ---
# Returns empty string if the file, key, or CLAUDE_PLUGIN_DATA is missing —
# callers apply their own default. Never throws on a malformed file.

duck__config_get() {
  local key="$1"
  local config_file="${CLAUDE_PLUGIN_DATA:-${TMPDIR:-/tmp}}/config.json"
  [[ -f "$config_file" ]] || return 0

  if command -v jq &>/dev/null; then
    jq -r ".$key // empty" "$config_file" 2>/dev/null
  else
    grep -oE "\"$key\" *: *\"[^\"]*\"" "$config_file" 2>/dev/null | head -1 | sed "s/\"$key\" *: *\"//;s/\"$//"
  fi
}
