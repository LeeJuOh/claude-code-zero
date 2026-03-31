#!/usr/bin/env bash
# Stop hook: optional Codex review gate before session ends
# Only runs if stopGate is enabled in config.json
set -euo pipefail

PLUGIN_DATA="${CLAUDE_PLUGIN_DATA:-}"
if [ -z "$PLUGIN_DATA" ]; then
  exit 0
fi

CONFIG="$PLUGIN_DATA/config.json"

# Check if stop gate is enabled
if [ ! -f "$CONFIG" ]; then
  exit 0
fi

ENABLED=$(jq -r '.stopGate // false' "$CONFIG" 2>/dev/null)
if [ "$ENABLED" != "true" ]; then
  exit 0
fi

# Check if there are actual code changes
DIFF=$(git diff --stat 2>/dev/null || true)
DIFF_CACHED=$(git diff --cached --stat 2>/dev/null || true)

if [ -z "$DIFF" ] && [ -z "$DIFF_CACHED" ]; then
  # No code changes — allow immediately
  exit 0
fi

# Code changes detected — suggest review
jq -n '{
  "additionalContext": "[codex-advisor stop-gate] Code changes detected in this session. Consider running /codex-review before ending to get a Codex second opinion."
}'

exit 0
