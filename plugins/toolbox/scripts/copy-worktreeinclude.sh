#!/bin/bash
# Copy files listed in .worktreeinclude from project root to worktree
PROJECT_ROOT="$1"
WORKTREE_PATH="$2"
INCLUDE_FILE="$PROJECT_ROOT/.worktreeinclude"

if [[ ! -f "$INCLUDE_FILE" ]]; then
  echo "No .worktreeinclude file found. Skipping."
  exit 0
fi

COPIED=0
while IFS= read -r pattern || [[ -n "$pattern" ]]; do
  # Skip empty lines and comments
  [[ -z "$pattern" || "$pattern" =~ ^[[:space:]]*# ]] && continue
  pattern="${pattern%%[[:space:]]#*}"  # trim trailing comments
  pattern="${pattern%"${pattern##*[! ]}"}"  # trim trailing spaces

  # Expand pattern relative to project root
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
    COPIED=$((COPIED + 1))
  done
done < "$INCLUDE_FILE"

if [[ $COPIED -eq 0 ]]; then
  echo "No files matched .worktreeinclude patterns."
else
  echo "Copied $COPIED item(s) from .worktreeinclude."
fi
exit 0
