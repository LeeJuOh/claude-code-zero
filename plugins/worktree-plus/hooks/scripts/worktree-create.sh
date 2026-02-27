#!/bin/bash
set -euo pipefail

# Read JSON input from stdin
INPUT=$(cat)
NAME=$(echo "$INPUT" | jq -r '.name')
CWD=$(echo "$INPUT" | jq -r '.cwd')

if [ -z "$NAME" ] || [ "$NAME" = "null" ]; then
  echo "Error: name not provided" >&2
  exit 1
fi

if [ -z "$CWD" ] || [ "$CWD" = "null" ]; then
  echo "Error: cwd not provided" >&2
  exit 1
fi

# Determine the project root (top-level of the git repo)
PROJECT_ROOT=$(git -C "$CWD" rev-parse --show-toplevel)

# Determine branch name based on WORKTREE_BRANCH_PREFIX
# - unset/not set → "worktree-<name>"
# - =""           → "<name>" (no prefix)
# - ="feat"       → "feat-<name>"
if [ -z "${WORKTREE_BRANCH_PREFIX+x}" ]; then
  BRANCH="worktree-${NAME}"
elif [ -z "$WORKTREE_BRANCH_PREFIX" ]; then
  BRANCH="${NAME}"
else
  BRANCH="${WORKTREE_BRANCH_PREFIX}-${NAME}"
fi

# Worktree directory under .claude/worktrees/
WORKTREE_DIR="${PROJECT_ROOT}/.claude/worktrees/${NAME}"

# Create the worktree
echo "Creating worktree: ${WORKTREE_DIR} (branch: ${BRANCH})" >&2
if git -C "$PROJECT_ROOT" show-ref --verify --quiet "refs/heads/${BRANCH}" 2>/dev/null; then
  # Branch already exists — reuse it
  echo "Branch '${BRANCH}' already exists, reusing" >&2
  git -C "$PROJECT_ROOT" worktree add "$WORKTREE_DIR" "$BRANCH" >&2
else
  # Create new branch from HEAD
  git -C "$PROJECT_ROOT" worktree add -b "$BRANCH" "$WORKTREE_DIR" HEAD >&2
fi

# Process .worktreeinclude if it exists
INCLUDE_FILE="${PROJECT_ROOT}/.worktreeinclude"
if [ -f "$INCLUDE_FILE" ]; then
  echo "Processing .worktreeinclude..." >&2

  # Get list of gitignored files (existing but ignored)
  IGNORED_FILES=$(cd "$PROJECT_ROOT" && git ls-files --others --ignored --exclude-standard 2>/dev/null || true)

  while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comments
    line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [ -z "$line" ] && continue
    [[ "$line" == \#* ]] && continue

    # Determine mode: link or copy
    MODE="copy"
    PATTERN="$line"
    if [[ "$line" == link:* ]]; then
      MODE="link"
      PATTERN="${line#link:}"
    fi

    # Remove trailing slash for matching, but remember if it was a directory pattern
    IS_DIR_PATTERN=false
    if [[ "$PATTERN" == */ ]]; then
      IS_DIR_PATTERN=true
      PATTERN_CLEAN="${PATTERN%/}"
    else
      PATTERN_CLEAN="$PATTERN"
    fi

    # Find matching gitignored files/directories
    MATCHED=false
    while IFS= read -r ignored_file; do
      [ -z "$ignored_file" ] && continue

      # Check if this ignored file matches the pattern
      MATCH=false
      if [ "$IS_DIR_PATTERN" = true ]; then
        # Directory pattern: match files under this directory
        if [[ "$ignored_file" == "${PATTERN_CLEAN}/"* ]] || [[ "$ignored_file" == "$PATTERN_CLEAN" ]]; then
          MATCH=true
        fi
      else
        # File pattern: exact match or glob-style match
        if [[ "$ignored_file" == "$PATTERN_CLEAN" ]]; then
          MATCH=true
        fi
        # Support simple glob patterns (e.g., .env*)
        if [ "$MATCH" = false ]; then
          # Use bash pattern matching
          case "$ignored_file" in
            $PATTERN_CLEAN) MATCH=true ;;
          esac
        fi
      fi

      if [ "$MATCH" = true ]; then
        MATCHED=true
        SRC="${PROJECT_ROOT}/${ignored_file}"
        DEST="${WORKTREE_DIR}/${ignored_file}"

        if [ "$IS_DIR_PATTERN" = true ] && [ "$MODE" = "link" ]; then
          # For directory link patterns, we link the top-level directory once
          SRC_DIR="${PROJECT_ROOT}/${PATTERN_CLEAN}"
          DEST_DIR="${WORKTREE_DIR}/${PATTERN_CLEAN}"
          if [ ! -e "$DEST_DIR" ] && [ -e "$SRC_DIR" ]; then
            mkdir -p "$(dirname "$DEST_DIR")"
            ln -s "$SRC_DIR" "$DEST_DIR"
            echo "  linked: ${PATTERN_CLEAN}/" >&2
          fi
          # Break since we only need to link once for directory patterns
          break
        elif [ "$MODE" = "link" ]; then
          if [ ! -e "$DEST" ] && [ -e "$SRC" ]; then
            mkdir -p "$(dirname "$DEST")"
            ln -s "$SRC" "$DEST"
            echo "  linked: ${ignored_file}" >&2
          fi
        else
          if [ ! -e "$DEST" ] && [ -e "$SRC" ]; then
            mkdir -p "$(dirname "$DEST")"
            cp -a "$SRC" "$DEST"
            echo "  copied: ${ignored_file}" >&2
          fi
        fi
      fi
    done <<< "$IGNORED_FILES"

    # Handle directory link/copy when the directory itself isn't listed in git ls-files
    if [ "$MATCHED" = false ] && [ "$IS_DIR_PATTERN" = true ]; then
      SRC_DIR="${PROJECT_ROOT}/${PATTERN_CLEAN}"
      DEST_DIR="${WORKTREE_DIR}/${PATTERN_CLEAN}"
      if [ -d "$SRC_DIR" ] && [ ! -e "$DEST_DIR" ]; then
        mkdir -p "$(dirname "$DEST_DIR")"
        if [ "$MODE" = "link" ]; then
          ln -s "$SRC_DIR" "$DEST_DIR"
          echo "  linked: ${PATTERN_CLEAN}/" >&2
        else
          cp -a "$SRC_DIR" "$DEST_DIR"
          echo "  copied: ${PATTERN_CLEAN}/" >&2
        fi
      fi
    fi

    # Handle direct file match when not found in git ls-files output
    if [ "$MATCHED" = false ] && [ "$IS_DIR_PATTERN" = false ]; then
      SRC="${PROJECT_ROOT}/${PATTERN_CLEAN}"
      DEST="${WORKTREE_DIR}/${PATTERN_CLEAN}"
      if [ -f "$SRC" ] && [ ! -e "$DEST" ]; then
        # Verify the file is actually gitignored
        if git -C "$PROJECT_ROOT" check-ignore -q "$SRC" 2>/dev/null; then
          mkdir -p "$(dirname "$DEST")"
          if [ "$MODE" = "link" ]; then
            ln -s "$SRC" "$DEST"
            echo "  linked: ${PATTERN_CLEAN}" >&2
          else
            cp -a "$SRC" "$DEST"
            echo "  copied: ${PATTERN_CLEAN}" >&2
          fi
        fi
      fi
    fi

  done < "$INCLUDE_FILE"
fi

# Output the worktree path (this is what Claude Code reads)
echo "$WORKTREE_DIR"
