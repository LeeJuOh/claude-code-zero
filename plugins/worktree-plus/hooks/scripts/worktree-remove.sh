#!/usr/bin/env bash
set -eu

# WorktreeRemove hook — safe-by-default worktree cleanup
# Input (stdin JSON): { "worktree_path": "/absolute/path/to/worktree", ... }
# Output: none (no decision control)
#
# Behavior:
#   1. Force-remove marker exists (.worktree-force-remove) → force delete
#   2. Work state is dirty (uncommitted/unpushed/stashed) → preserve
#   3. Clean → auto-delete

INPUT=$(cat)
WORKTREE_PATH=$(echo "$INPUT" | jq -r '.worktree_path')

if [ -z "$WORKTREE_PATH" ] || [ "$WORKTREE_PATH" = "null" ]; then
  echo "Error: worktree_path not provided" >&2
  exit 1
fi

if [ ! -d "$WORKTREE_PATH" ]; then
  echo "Worktree directory not found: $WORKTREE_PATH" >&2
  exit 0
fi

# Read branch name from the log file created by worktree-create.sh
LOG_FILE="${WORKTREE_PATH}/.worktree-create.log"
BRANCH=""
if [ -f "$LOG_FILE" ]; then
  BRANCH=$(grep '^Branch:' "$LOG_FILE" | sed 's/^Branch:[[:space:]]*//' | tr -d '\r')
fi

# Find the main repository
PROJECT_ROOT=$(cd "$WORKTREE_PATH" && git rev-parse --show-superproject-working-tree 2>/dev/null || true)
if [ -z "$PROJECT_ROOT" ]; then
  PROJECT_ROOT=$(echo "$WORKTREE_PATH" | sed 's|/\.claude/worktrees/.*$||')
fi

# --- 1. Force-remove marker check ---
FORCE_MARKER="${WORKTREE_PATH}/.worktree-force-remove"
if [ -f "$FORCE_MARKER" ]; then
  echo "Force-remove marker found, deleting worktree: $WORKTREE_PATH" >&2
  git -C "$PROJECT_ROOT" worktree remove "$WORKTREE_PATH" --force >&2 2>/dev/null || {
    rm -rf "$WORKTREE_PATH"
    git -C "$PROJECT_ROOT" worktree prune >&2 2>/dev/null || true
  }
  if [ -n "$BRANCH" ]; then
    git -C "$PROJECT_ROOT" branch -D "$BRANCH" >&2 2>/dev/null || true
    echo "Deleted branch: $BRANCH" >&2
  fi
  exit 0
fi

# --- 2. Work state inspection ---
DIRTY_REASONS=""

# 2a. Uncommitted changes
UNCOMMITTED=$(git -C "$WORKTREE_PATH" status --porcelain 2>/dev/null || true)
if [ -n "$UNCOMMITTED" ]; then
  COUNT=$(echo "$UNCOMMITTED" | wc -l | tr -d ' ')
  DIRTY_REASONS="${DIRTY_REASONS}  - ${COUNT} uncommitted file(s)\n"
fi

# 2b. Unpushed commits
if [ -n "$BRANCH" ]; then
  UPSTREAM=$(git -C "$WORKTREE_PATH" rev-parse --abbrev-ref "${BRANCH}@{upstream}" 2>/dev/null || true)
  if [ -n "$UPSTREAM" ]; then
    UNPUSHED=$(git -C "$WORKTREE_PATH" rev-list "${UPSTREAM}..${BRANCH}" --count 2>/dev/null || echo "0")
  else
    # No upstream — compare against parent HEAD
    PARENT_HEAD=$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || true)
    if [ -n "$PARENT_HEAD" ]; then
      UNPUSHED=$(git -C "$WORKTREE_PATH" rev-list "${PARENT_HEAD}..${BRANCH}" --count 2>/dev/null || echo "0")
    else
      UNPUSHED="0"
    fi
  fi
  if [ "$UNPUSHED" != "0" ]; then
    DIRTY_REASONS="${DIRTY_REASONS}  - ${UNPUSHED} unpushed commit(s)\n"
  fi
fi

# 2c. Stashed changes
STASH_COUNT=$(git -C "$WORKTREE_PATH" stash list 2>/dev/null | wc -l | tr -d ' ')
if [ "$STASH_COUNT" != "0" ]; then
  DIRTY_REASONS="${DIRTY_REASONS}  - ${STASH_COUNT} stash(es)\n"
fi

# --- 3. Decision ---
if [ -n "$DIRTY_REASONS" ]; then
  # Dirty → preserve
  echo "Worktree preserved (has unsaved work): $WORKTREE_PATH" >&2
  printf "Unsaved work detected:\n%b" "$DIRTY_REASONS" >&2
  echo "" >&2
  echo "To resume work:" >&2
  echo "  cd $WORKTREE_PATH" >&2
  echo "" >&2
  echo "To force remove:" >&2
  echo "  git -C $PROJECT_ROOT worktree remove $WORKTREE_PATH --force" >&2
  if [ -n "$BRANCH" ]; then
    echo "  git -C $PROJECT_ROOT branch -D $BRANCH" >&2
  fi
  exit 0
fi

# Clean → auto-delete
echo "Removing clean worktree: $WORKTREE_PATH" >&2
git -C "$PROJECT_ROOT" worktree remove "$WORKTREE_PATH" >&2 2>/dev/null || {
  echo "git worktree remove failed for clean worktree: $WORKTREE_PATH" >&2
  exit 0
}

if [ -n "$BRANCH" ]; then
  if git -C "$PROJECT_ROOT" branch -d "$BRANCH" 2>/dev/null; then
    echo "Deleted branch: $BRANCH" >&2
  else
    echo "Branch '$BRANCH' has unmerged changes, kept intact" >&2
  fi
fi

exit 0
