#!/bin/bash
set -euo pipefail

INPUT=$(cat)
WORKTREE_PATH=$(echo "$INPUT" | jq -r '.worktree_path')

if [ -z "$WORKTREE_PATH" ] || [ "$WORKTREE_PATH" = "null" ]; then
  echo "Error: worktree_path not provided" >&2
  exit 1
fi

if [ ! -d "$WORKTREE_PATH" ]; then
  echo "Worktree directory does not exist: $WORKTREE_PATH" >&2
  exit 0
fi

# Get the git dir to find the main repo
MAIN_REPO=$(git -C "$WORKTREE_PATH" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's|/\.git$||')

if [ -n "$MAIN_REPO" ]; then
  git -C "$MAIN_REPO" worktree remove --force "$WORKTREE_PATH" >&2 || {
    echo "git worktree remove failed, falling back to rm" >&2
    rm -rf "$WORKTREE_PATH"
  }
else
  rm -rf "$WORKTREE_PATH"
fi

exit 0
