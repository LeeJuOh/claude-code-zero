#!/usr/bin/env bash
set -eu

# WorktreeRemove hook — worktree and branch cleanup
# Input (stdin JSON): { "worktree_path": "/absolute/path/to/worktree", ... }
# Output: none (no decision control)
#
# Claude Code's built-in prompt handles the Keep/Remove decision.
# This hook only performs the actual removal when triggered.

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

# Get branch name directly from git
BRANCH=$(git -C "$WORKTREE_PATH" rev-parse --abbrev-ref HEAD 2>/dev/null || true)

# Find the main repository
PROJECT_ROOT=$(cd "$WORKTREE_PATH" && git rev-parse --show-superproject-working-tree 2>/dev/null || true)
if [ -z "$PROJECT_ROOT" ]; then
  PROJECT_ROOT=$(echo "$WORKTREE_PATH" | sed 's|/\.claude/worktrees/.*$||')
fi

# Remove worktree
echo "Removing worktree: $WORKTREE_PATH" >&2
git -C "$PROJECT_ROOT" worktree remove "$WORKTREE_PATH" --force >&2 2>/dev/null || {
  rm -rf "$WORKTREE_PATH"
  git -C "$PROJECT_ROOT" worktree prune >&2 2>/dev/null || true
}

# Clean up branch
if [ -n "$BRANCH" ]; then
  git -C "$PROJECT_ROOT" branch -D "$BRANCH" >&2 2>/dev/null || true
  echo "Deleted branch: $BRANCH" >&2
fi

exit 0
