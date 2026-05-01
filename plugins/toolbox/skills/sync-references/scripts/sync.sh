#!/usr/bin/env bash
# sync.sh — Pull latest from origin for all git repos under references/
# Usage: bash sync.sh <references-dir>

set -uo pipefail

REFS_DIR="${1:-references}"

if [ ! -d "$REFS_DIR" ]; then
  echo "ERROR: Directory '$REFS_DIR' not found" >&2
  exit 1
fi

OK=()
SKIPPED=()
FAILED=()

for dir in "$REFS_DIR"/*/; do
  name=$(basename "$dir")

  if [ ! -d "$dir/.git" ]; then
    SKIPPED+=("$name (not a git repo)")
    continue
  fi

  branch=$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  if ! git -C "$dir" fetch origin 2>/dev/null; then
    FAILED+=("  ✗ $name [$branch] — fetch failed")
    continue
  fi
  if result=$(git -C "$dir" merge --ff-only "origin/$branch" 2>&1); then
    if echo "$result" | grep -q "Already up to date"; then
      OK+=("  ✓ $name [$branch] — already up to date")
    else
      changed=$(echo "$result" | grep -E "^[[:space:]]+[0-9]+ file" | head -1 | xargs)
      OK+=("  ✓ $name [$branch] — updated${changed:+ ($changed)}")
    fi
  else
    short=$(echo "$result" | tail -1)
    FAILED+=("  ✗ $name [$branch] — $short")
  fi
done

total=$(( ${#OK[@]} + ${#SKIPPED[@]} + ${#FAILED[@]} ))
echo "Synced $REFS_DIR — $total repos checked"
echo ""

if [ ${#OK[@]} -gt 0 ]; then
  printf '%s\n' "${OK[@]}"
fi

if [ ${#SKIPPED[@]} -gt 0 ]; then
  echo ""
  echo "Skipped:"
  printf '  - %s\n' "${SKIPPED[@]}"
fi

if [ ${#FAILED[@]} -gt 0 ]; then
  echo ""
  echo "Failed:"
  printf '%s\n' "${FAILED[@]}"
  exit 1
fi
