#!/usr/bin/env bash
set -eu

# WorktreeCreate hook — custom worktree with remote tracking, .worktreeinclude, and .worktreelink
# Input (stdin JSON): { "name": "...", "cwd": "..." }
# Output (stdout): absolute worktree path

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

PROJECT_ROOT=$(git -C "$CWD" rev-parse --show-toplevel)

# Branch name: worktreeplus.branchPrefix controls the prefix.
#   unset  -> "worktree-<name>" (built-in default, matches Claude Code baseline)
#   =""    -> "<name>" (no prefix)
#   ="feat-" -> "feat-<name>" (literal — user controls the separator)
PREFIX=$(git -C "$PROJECT_ROOT" config --get worktreeplus.branchPrefix 2>/dev/null) || PREFIX="worktree-"
# --get returns exit 1 when unset, which set -e would trip on — guard with `|| fallback`.
# Literal join: `$PREFIX` is prepended as-is. If user wants "feat-xxx" they set "feat-".
BRANCH="${PREFIX}${NAME}"

# Worktree directory base: worktreeplus.dirBase controls where worktrees live.
#   unset or empty  -> ".claude/worktrees" (relative to PROJECT_ROOT)
#   relative path   -> "$PROJECT_ROOT/<path>/<name>"
#   absolute path   -> "<path>/<name>" (verbatim)
# Strip trailing slash so joining doesn't produce "//".
DIR_BASE=$(git -C "$PROJECT_ROOT" config --get worktreeplus.dirBase 2>/dev/null) || DIR_BASE=""
[ -z "$DIR_BASE" ] && DIR_BASE=".claude/worktrees"
DIR_BASE="${DIR_BASE%/}"

case "$DIR_BASE" in
  '~'|'~/'*)
    echo "Error: worktreeplus.dirBase does not expand '~' — use an absolute path (e.g., \"$HOME/worktrees\")." >&2
    exit 1
    ;;
  /*) WORKTREE_DIR="${DIR_BASE}/${NAME}" ;;
  *)  WORKTREE_DIR="${PROJECT_ROOT}/${DIR_BASE}/${NAME}" ;;
esac

# --- Pre-checks ---

# 1. Path already exists as a valid worktree -> reuse it
#    WorktreeCreate must always output a path to stdout; exit 1 with no stdout
#    causes Claude Code to hang indefinitely waiting for the path.
if [ -d "$WORKTREE_DIR" ] && [ -e "$WORKTREE_DIR/.git" ]; then
  echo "Reusing existing worktree: ${WORKTREE_DIR}" >&2
  echo "$WORKTREE_DIR"
  exit 0
fi

# 2. Branch already checked out by another worktree -> reuse that worktree
CHECKED_OUT_AT=$(git -C "$PROJECT_ROOT" worktree list --porcelain 2>/dev/null \
  | awk -v branch="$BRANCH" '
    /^worktree /{ wt=$2 }
    /^branch refs\/heads\// {
      sub(/^branch refs\/heads\//, "")
      if ($0 == branch) { print wt; exit }
    }
  ')
if [ -n "$CHECKED_OUT_AT" ]; then
  echo "Reusing worktree at '${CHECKED_OUT_AT}' (branch '${BRANCH}' already checked out)" >&2
  echo "$CHECKED_OUT_AT"
  exit 0
fi

# Read guessRemote config (default: true)
GUESS_REMOTE=$(git -C "$PROJECT_ROOT" config --get worktree.guessRemote 2>/dev/null || echo "true")

# --- Branch resolution ---
echo "Creating worktree: ${WORKTREE_DIR} (branch: ${BRANCH})" >&2

if git -C "$PROJECT_ROOT" show-ref --verify --quiet "refs/heads/${BRANCH}" 2>/dev/null; then
  # 1. Local branch exists -> reuse
  echo "Reusing local branch '${BRANCH}'" >&2
  git -C "$PROJECT_ROOT" worktree add "$WORKTREE_DIR" "$BRANCH" >&2
else
  TRACKED=false
  if [ "$GUESS_REMOTE" = "true" ]; then
    # Try fetch to ensure up-to-date remote refs
    git -C "$PROJECT_ROOT" fetch origin "$BRANCH" 2>/dev/null || true
    if git -C "$PROJECT_ROOT" show-ref --verify --quiet "refs/remotes/origin/${BRANCH}" 2>/dev/null; then
      # 2. Remote branch exists -> create tracking branch
      echo "Tracking remote branch 'origin/${BRANCH}'" >&2
      git -C "$PROJECT_ROOT" worktree add -b "$BRANCH" "$WORKTREE_DIR" --track "origin/${BRANCH}" >&2
      TRACKED=true
    fi
  fi
  if [ "$TRACKED" = false ]; then
    # 3. No branch found -> new from base
    # worktreeplus.baseBranch git config (default: HEAD)
    BASE=$(git -C "$PROJECT_ROOT" config --get worktreeplus.baseBranch 2>/dev/null) || BASE="HEAD"
    echo "Creating new branch '${BRANCH}' from ${BASE}" >&2
    git -C "$PROJECT_ROOT" worktree add -b "$BRANCH" "$WORKTREE_DIR" "$BASE" >&2
  fi
fi

# --- Logging ---
LOG_FILE="${WORKTREE_DIR}/.worktree.log"
log() { echo "$1" >&2; echo "$1" >> "$LOG_FILE"; }

{
  echo "Created: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Name:    $NAME"
  echo "Branch:  $BRANCH"
  echo "Base:    ${BASE:-auto}"
  echo "Source:  $PROJECT_ROOT"
  echo "---"
} > "$LOG_FILE"

# --- .worktreeinclude (copy only) ---
INCLUDE_FILE="${PROJECT_ROOT}/.worktreeinclude"
if [ -f "$INCLUDE_FILE" ]; then
  log "Processing .worktreeinclude..."

  while IFS= read -r line || [ -n "$line" ]; do
    # CRLF defense + trim whitespace
    line=$(printf '%s' "$line" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [ -z "$line" ] && continue
    [[ "$line" == \#* ]] && continue

    # Strip trailing slash for uniform path handling
    PATTERN="${line%/}"
    SRC="${PROJECT_ROOT}/${PATTERN}"
    DEST="${WORKTREE_DIR}/${PATTERN}"

    if [ -d "$SRC" ]; then
      if [ ! -e "$DEST" ]; then
        mkdir -p "$(dirname "$DEST")"
        if cp -R "$SRC" "$DEST"; then
          log "  copied: ${PATTERN}/"
        else
          log "  FAILED: ${PATTERN}/"
        fi
      fi
    elif [ -f "$SRC" ]; then
      if [ ! -e "$DEST" ]; then
        mkdir -p "$(dirname "$DEST")"
        if cp "$SRC" "$DEST"; then
          log "  copied: ${PATTERN}"
        else
          log "  FAILED: ${PATTERN}"
        fi
      fi
    else
      log "  skipped (not found): ${PATTERN}"
    fi
  done < "$INCLUDE_FILE"
fi

# --- .worktreelink (symlink) ---
LINK_FILE="${PROJECT_ROOT}/.worktreelink"
if [ -f "$LINK_FILE" ]; then
  log "Processing .worktreelink..."

  while IFS= read -r line || [ -n "$line" ]; do
    # CRLF defense + trim whitespace
    line=$(printf '%s' "$line" | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [ -z "$line" ] && continue
    [[ "$line" == \#* ]] && continue

    # Strip trailing slash for uniform path handling
    PATTERN="${line%/}"
    SRC="${PROJECT_ROOT}/${PATTERN}"
    DEST="${WORKTREE_DIR}/${PATTERN}"

    if [ -e "$SRC" ]; then
      if [ ! -e "$DEST" ]; then
        mkdir -p "$(dirname "$DEST")"
        if ln -s "$SRC" "$DEST"; then
          log "  linked: ${PATTERN} -> ${SRC}"
        else
          log "  FAILED: ${PATTERN}"
        fi
      fi
    else
      log "  skipped (not found): ${PATTERN}"
    fi
  done < "$LINK_FILE"
fi

# Output worktree path (required by Claude Code)
echo "$WORKTREE_DIR"
