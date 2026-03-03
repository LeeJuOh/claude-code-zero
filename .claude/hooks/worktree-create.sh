#!/usr/bin/env bash
set -eu

# WorktreeCreate hook — replaces default git worktree behavior
# Reads JSON input from stdin, creates worktree, copies gitignored dirs, prints path

INPUT=$(cat)
NAME=$(echo "$INPUT" | jq -r '.name')
CWD=$(echo "$INPUT" | jq -r '.cwd')

WORKTREE_DIR="$CWD/.claude/worktrees/$NAME"
BRANCH="worktree-$NAME"

# Create git worktree
git -C "$CWD" worktree add -b "$BRANCH" "$WORKTREE_DIR" HEAD >&2

# Copy gitignored directories listed in .worktreeinclude
INCLUDE_FILE="$CWD/.worktreeinclude"
if [ -f "$INCLUDE_FILE" ]; then
  while IFS= read -r line; do
    # Skip comments and empty lines
    line=$(echo "$line" | sed 's/#.*//' | xargs)
    [ -z "$line" ] && continue

    SRC="$CWD/$line"
    DEST="$WORKTREE_DIR/$line"

    if [ -d "$SRC" ]; then
      mkdir -p "$(dirname "$DEST")"
      cp -R "$SRC" "$DEST" >&2 2>/dev/null || true
      echo "Copied: $line" >&2
    elif [ -f "$SRC" ]; then
      mkdir -p "$(dirname "$DEST")"
      cp "$SRC" "$DEST" >&2 2>/dev/null || true
      echo "Copied: $line" >&2
    fi
  done < <(cat "$INCLUDE_FILE"; echo)
fi

# Write creation log inside worktree
LOG="$WORKTREE_DIR/.worktree-create.log"
{
  echo "Created: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Name:    $NAME"
  echo "Branch:  $BRANCH"
  echo "Source:  $CWD"
  echo "---"
  echo "Copied:"
} > "$LOG"

if [ -f "$INCLUDE_FILE" ]; then
  while IFS= read -r entry; do
    entry=$(echo "$entry" | sed 's/#.*//' | xargs)
    [ -z "$entry" ] && continue
    [ -d "$WORKTREE_DIR/$entry" ] || [ -f "$WORKTREE_DIR/$entry" ] && echo "  $entry" >> "$LOG"
  done < <(cat "$INCLUDE_FILE"; echo)
fi

# Print worktree path to stdout (required by Claude Code)
echo "$WORKTREE_DIR"