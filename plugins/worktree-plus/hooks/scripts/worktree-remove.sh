#!/usr/bin/env bash
set -eu

# WorktreeRemove hook — worktree and branch cleanup with dirty check
# Input (stdin JSON): { "worktree_path": "/absolute/path/to/worktree", ... }
# Output: none (no decision control)
#
# Safety: refuses removal when the worktree has uncommitted changes,
# untracked files, or unpushed commits. Logs all removal attempts.

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

# Find the main repository via the shared .git directory.
# `git rev-parse --git-common-dir` returns the path (may be relative) to the
# .git directory shared across all worktrees. Its parent is the main repo root.
# --show-superproject-working-tree is unrelated (it's for submodules, not
# worktrees) and was always returning empty — the old sed fallback assumed the
# .claude/worktrees/ layout which no longer holds once dirBase is configurable.
GIT_COMMON=$(git -C "$WORKTREE_PATH" rev-parse --git-common-dir 2>/dev/null || true)
if [ -z "$GIT_COMMON" ]; then
  echo "Error: cannot locate main repo for worktree: $WORKTREE_PATH" >&2
  exit 1
fi
# git-common-dir may be relative — resolve against the worktree, then go up one.
PROJECT_ROOT=$(cd "$WORKTREE_PATH" && cd "$GIT_COMMON" && cd .. && pwd)

# --- Log to worktree's own .worktree.log (same file as create) ---
LOG_FILE="${WORKTREE_PATH}/.worktree.log"

log_entry() {
  local status="$1" reason="$2"
  {
    echo "--- ${status} ---"
    echo "Time:     $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Path:     $WORKTREE_PATH"
    echo "Branch:   ${BRANCH:-<detached>}"
    [ -n "$reason" ] && echo "$reason"
    echo ""
  } >> "$LOG_FILE"
}

# --- Dirty check ---
DIRTY_REASONS=""

# 1. Uncommitted changes (staged + unstaged + untracked)
CHANGES=$(git -C "$WORKTREE_PATH" status --porcelain 2>/dev/null || true)
if [ -n "$CHANGES" ]; then
  STAGED=$(echo "$CHANGES" | grep -c '^[MADRC]' || true)
  UNSTAGED=$(echo "$CHANGES" | grep -c '^.[MADRC]' || true)
  UNTRACKED=$(echo "$CHANGES" | grep -c '^??' || true)
  SUMMARY=""
  [ "$STAGED" -gt 0 ] && SUMMARY+="staged: ${STAGED}  "
  [ "$UNSTAGED" -gt 0 ] && SUMMARY+="unstaged: ${UNSTAGED}  "
  [ "$UNTRACKED" -gt 0 ] && SUMMARY+="untracked: ${UNTRACKED}"
  DIRTY_REASONS+="Changes:  ${SUMMARY}\n"
  DIRTY_REASONS+="$(echo "$CHANGES" | sed 's/^/  /')\n"
fi

# 2. Unpushed commits
UPSTREAM=$(git -C "$WORKTREE_PATH" rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || true)
if [ -n "$UPSTREAM" ]; then
  UNPUSHED=$(git -C "$WORKTREE_PATH" log "${UPSTREAM}..HEAD" --oneline 2>/dev/null || true)
  if [ -n "$UNPUSHED" ]; then
    COUNT=$(echo "$UNPUSHED" | wc -l | tr -d ' ')
    DIRTY_REASONS+="Unpushed: ${COUNT} commit(s)\n"
    DIRTY_REASONS+="$(echo "$UNPUSHED" | sed 's/^/  /')\n"
  fi
fi

# Block removal if dirty
if [ -n "$DIRTY_REASONS" ]; then
  echo "BLOCKED: worktree has uncommitted work — refusing to delete" >&2
  echo "" >&2
  printf "%b" "$DIRTY_REASONS" >&2
  echo "" >&2
  echo "To force removal, commit or stash your changes first." >&2

  log_entry "BLOCKED" "$(printf "%b" "$DIRTY_REASONS")"
  exit 1
fi

# --- Remove worktree ---
echo "Removing worktree: $WORKTREE_PATH" >&2
if ! git -C "$PROJECT_ROOT" worktree remove "$WORKTREE_PATH" --force >&2; then
  echo "Failed to remove worktree via git; directory left untouched: $WORKTREE_PATH" >&2
  exit 1
fi

# Clean up branch only when upstream exists (hook-created tracking or pushed branches)
if [ -n "$BRANCH" ] && [ -n "$UPSTREAM" ]; then
  git -C "$PROJECT_ROOT" branch -D "$BRANCH" >&2 2>/dev/null || true
  echo "Deleted branch: $BRANCH" >&2
else
  echo "Preserved branch: ${BRANCH:-<detached>}" >&2
fi

log_entry "REMOVED" ""
exit 0
