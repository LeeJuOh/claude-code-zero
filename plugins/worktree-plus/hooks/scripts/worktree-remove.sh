#!/usr/bin/env bash
set -eu

# WorktreeRemove hook — clean up worktree directory and branch
# Input (stdin JSON): { "worktree_path": "/absolute/path/to/worktree", ... }
# Output: none (cleanup only, no decision control)

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

# Find the main repository (parent of .claude/worktrees/)
# worktree_path is typically: <project_root>/.claude/worktrees/<name>
PROJECT_ROOT=$(cd "$WORKTREE_PATH" && git rev-parse --show-superproject-working-tree 2>/dev/null || true)
if [ -z "$PROJECT_ROOT" ]; then
  # Fallback: derive from path structure
  PROJECT_ROOT=$(echo "$WORKTREE_PATH" | sed 's|/\.claude/worktrees/.*$||')
fi

# Remove the worktree via git
echo "Removing worktree: $WORKTREE_PATH" >&2
git -C "$PROJECT_ROOT" worktree remove "$WORKTREE_PATH" --force >&2 || {
  # Fallback: manual removal if git worktree remove fails
  echo "git worktree remove failed, removing directory manually" >&2
  rm -rf "$WORKTREE_PATH"
  git -C "$PROJECT_ROOT" worktree prune >&2 || true
}

# Delete the branch if it was created by worktree-create.sh
if [ -n "$BRANCH" ]; then
  # Only delete if the branch is fully merged or if it's a worktree-specific branch
  if git -C "$PROJECT_ROOT" branch -d "$BRANCH" 2>/dev/null; then
    echo "Deleted branch: $BRANCH" >&2
  else
    echo "Branch '$BRANCH' has unmerged changes, kept intact" >&2
  fi
fi

exit 0