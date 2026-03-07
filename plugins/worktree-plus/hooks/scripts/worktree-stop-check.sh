#!/usr/bin/env bash
set -eu

# Stop hook — prompt user to keep or remove dirty worktrees before session ends
# Input (stdin JSON): { "cwd": "...", "stop_hook_active": bool, ... }
# Output (stdout JSON): { "decision": "block", "reason": "..." } to continue

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd')
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active')

# Guard 1: prevent infinite loop — if already re-entered via stop hook, pass through
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  exit 0
fi

# Guard 2: only act when CWD is inside a .claude/worktrees/ directory
if [[ "$CWD" != */.claude/worktrees/* ]]; then
  exit 0
fi

# Guard 3: only ask once per session (flag file in worktree root)
CLEANUP_FLAG="${CWD}/.worktree-cleanup-asked"
if [ -f "$CLEANUP_FLAG" ]; then
  exit 0
fi

# Check git status
DIRTY_FILES=$(git -C "$CWD" status --porcelain 2>/dev/null || true)
if [ -z "$DIRTY_FILES" ]; then
  # Clean worktree — no need to ask, let WorktreeRemove handle it
  exit 0
fi

# Mark as asked (session-once guard)
touch "$CLEANUP_FLAG"

# Count changes for summary
CHANGE_COUNT=$(echo "$DIRTY_FILES" | wc -l | tr -d ' ')

# Build reason message for Claude
REASON="WORKTREE CLEANUP CHECK: This worktree has ${CHANGE_COUNT} uncommitted change(s).

Ask the user whether to KEEP or REMOVE this worktree:
- KEEP: preserve the worktree with all changes intact (user can return later)
- REMOVE: discard all changes and delete the worktree

If the user chooses REMOVE, run this command before ending:
  touch \"${CWD}/.worktree-force-remove\"

If the user chooses KEEP, do nothing — just acknowledge and finish."

# Block stop to let Claude ask the user
echo "{\"decision\": \"block\", \"reason\": $(echo "$REASON" | jq -Rs .)}" | jq .
