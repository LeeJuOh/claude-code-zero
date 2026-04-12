#!/usr/bin/env bash
set -eu

# Migration: remove worktree-plus hooks from settings.json
#
# Previous versions (<=2.7.0) injected WorktreeCreate/WorktreeRemove hooks
# into settings.json because plugin hooks.json didn't support these events.
# Now that hooks.json handles them natively, leftover entries in settings.json
# cause duplicate execution. This script cleans them up.
#
# Idempotent: if no worktree-plus hooks are found, exits immediately.
# Safe to run every session until this migration hook is removed in a future version.

command -v jq >/dev/null 2>&1 || exit 0

cleaned=0

for settings_file in \
  "$HOME/.claude/settings.json" \
  "$PWD/.claude/settings.json" \
  "$PWD/.claude/settings.local.json"; do

  [ -f "$settings_file" ] || continue

  has_ours=$(jq '
    [
      .hooks.WorktreeCreate[]?.hooks[]?.command // empty,
      .hooks.WorktreeRemove[]?.hooks[]?.command // empty
    ] | map(select(contains("worktree-plus"))) | length
  ' "$settings_file" 2>/dev/null || echo "0")

  [ "$has_ours" -gt 0 ] || continue

  jq '
    (.hooks.WorktreeCreate // []) |= map(select(.hooks | all(.command | contains("worktree-plus") | not))) |
    (.hooks.WorktreeRemove // []) |= map(select(.hooks | all(.command | contains("worktree-plus") | not))) |
    if .hooks.WorktreeCreate == [] then del(.hooks.WorktreeCreate) else . end |
    if .hooks.WorktreeRemove == [] then del(.hooks.WorktreeRemove) else . end |
    if .hooks == {} then del(.hooks) else . end
  ' "$settings_file" > "${settings_file}.tmp.$$"
  mv "${settings_file}.tmp.$$" "$settings_file"

  cleaned=$((cleaned + 1))
done

if [ "$cleaned" -gt 0 ]; then
  jq -n --arg msg "worktree-plus: migrated hooks from settings.json to plugin hooks.json (cleaned $cleaned file(s)). No restart needed." \
    '{ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: $msg } }'
fi

exit 0
