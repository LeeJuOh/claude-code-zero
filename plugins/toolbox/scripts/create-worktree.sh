#!/bin/bash
set -euo pipefail

# create-worktree.sh — Create a git worktree with .worktreeinclude/.worktreelink support
# Usage: create-worktree.sh <branch> [path]

BRANCH="${1:-}"
CUSTOM_PATH="${2:-}"

if [[ -z "$BRANCH" ]]; then
  echo "Error: branch name is required"
  echo "Usage: create-worktree.sh <branch> [path]"
  exit 1
fi

# Determine project root
PROJECT_ROOT="$(git rev-parse --show-toplevel)"

# Determine worktree path
if [[ -n "$CUSTOM_PATH" ]]; then
  WORKTREE_PATH="$PROJECT_ROOT/$CUSTOM_PATH"
else
  WORKTREE_PATH="$PROJECT_ROOT/.claude/worktrees/$BRANCH"
fi

# Check if worktree already exists at this path
EXISTING=$(git worktree list --porcelain | grep "^worktree " | sed 's/^worktree //')
for wt in $EXISTING; do
  if [[ "$wt" == "$WORKTREE_PATH" ]]; then
    echo "Error: A worktree already exists at $WORKTREE_PATH"
    echo "Use 'git worktree remove $WORKTREE_PATH' to remove it first."
    exit 1
  fi
done

# Determine branch status and create worktree
LOCAL_EXISTS=false
REMOTE_EXISTS=false

if git show-ref --verify --quiet "refs/heads/$BRANCH" 2>/dev/null; then
  LOCAL_EXISTS=true
fi

if git ls-remote --heads origin "$BRANCH" 2>/dev/null | grep -q .; then
  REMOTE_EXISTS=true
fi

if [[ "$LOCAL_EXISTS" == true ]]; then
  echo "Creating worktree for local branch '$BRANCH'..."
  git worktree add "$WORKTREE_PATH" "$BRANCH"
elif [[ "$REMOTE_EXISTS" == true ]]; then
  echo "Creating worktree for remote branch '$BRANCH'..."
  git worktree add "$WORKTREE_PATH" "$BRANCH"
else
  echo "Creating worktree with new branch '$BRANCH' from HEAD..."
  git worktree add -b "$BRANCH" "$WORKTREE_PATH"
fi

echo ""

# Process .worktreeinclude (copy)
INCLUDE_FILE="$PROJECT_ROOT/.worktreeinclude"
INCLUDE_COUNT=0

if [[ -f "$INCLUDE_FILE" ]]; then
  echo "Processing .worktreeinclude..."
  while IFS= read -r pattern || [[ -n "$pattern" ]]; do
    # Strip \r (Windows line endings)
    pattern="${pattern//$'\r'/}"
    # Skip empty lines and comments
    [[ -z "$pattern" || "$pattern" =~ ^[[:space:]]*# ]] && continue
    # Trim trailing comments and spaces
    pattern="${pattern%%[[:space:]]#*}"
    pattern="${pattern%"${pattern##*[! ]}"}"

    cd "$PROJECT_ROOT"
    for src in $pattern; do
      [[ -e "$src" ]] || continue
      dest="$WORKTREE_PATH/$src"
      mkdir -p "$(dirname "$dest")"
      if [[ -d "$src" ]]; then
        cp -r "$src" "$dest"
      else
        cp "$src" "$dest"
      fi
      echo "  Copied: $src"
      INCLUDE_COUNT=$((INCLUDE_COUNT + 1))
    done
  done < "$INCLUDE_FILE"

  if [[ $INCLUDE_COUNT -eq 0 ]]; then
    echo "  No files matched .worktreeinclude patterns."
  else
    echo "  Copied $INCLUDE_COUNT item(s)."
  fi
else
  echo "No .worktreeinclude file found. Skipping copy."
fi

echo ""

# Process .worktreelink (symlink)
LINK_FILE="$PROJECT_ROOT/.worktreelink"
LINK_COUNT=0

if [[ -f "$LINK_FILE" ]]; then
  echo "Processing .worktreelink..."
  while IFS= read -r pattern || [[ -n "$pattern" ]]; do
    # Strip \r (Windows line endings)
    pattern="${pattern//$'\r'/}"
    # Skip empty lines and comments
    [[ -z "$pattern" || "$pattern" =~ ^[[:space:]]*# ]] && continue
    # Trim trailing comments and spaces
    pattern="${pattern%%[[:space:]]#*}"
    pattern="${pattern%"${pattern##*[! ]}"}"

    cd "$PROJECT_ROOT"
    for src in $pattern; do
      [[ -e "$src" ]] || continue
      dest="$WORKTREE_PATH/$src"
      # Skip if already exists (e.g., copied by .worktreeinclude)
      if [[ -e "$dest" || -L "$dest" ]]; then
        echo "  Skipped (already exists): $src"
        continue
      fi
      mkdir -p "$(dirname "$dest")"
      ln -s "$PROJECT_ROOT/$src" "$dest"
      echo "  Linked: $src → $PROJECT_ROOT/$src"
      LINK_COUNT=$((LINK_COUNT + 1))
    done
  done < "$LINK_FILE"

  if [[ $LINK_COUNT -eq 0 ]]; then
    echo "  No files matched .worktreelink patterns."
  else
    echo "  Linked $LINK_COUNT item(s)."
  fi
else
  echo "No .worktreelink file found. Skipping symlink."
fi

echo ""
echo "Worktree ready: $WORKTREE_PATH (branch: $BRANCH)"
