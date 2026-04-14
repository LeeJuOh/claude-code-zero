#!/usr/bin/env bash
set -eu

# SessionStart hook — ensure WorktreeCreate/WorktreeRemove hooks are in settings.json
#
# Plugin hooks.json cannot reliably fire WorktreeCreate/WorktreeRemove for
# `claude -w` (CLI --worktree) because the worktree is created before plugins
# load. Settings.json hooks load earlier, so we inject there instead.
#
# Fast path: if hooks already point to the current plugin root, exit immediately.

command -v jq >/dev/null 2>&1 || exit 0

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-}"
[ -n "$PLUGIN_ROOT" ] || exit 0

EXPECTED_CREATE="$PLUGIN_ROOT/hooks/scripts/worktree-create.sh"
EXPECTED_REMOVE="$PLUGIN_ROOT/hooks/scripts/worktree-remove.sh"

# Scope detection: find which settings file has worktree-plus in enabledPlugins
SETTINGS_FILE=""
for candidate in \
  "$PWD/.claude/settings.local.json" \
  "$PWD/.claude/settings.json" \
  "$HOME/.claude/settings.json"; do
  [ -f "$candidate" ] || continue
  jq -e '.enabledPlugins // {} | keys | map(select(startswith("worktree-plus@"))) | length > 0' "$candidate" >/dev/null 2>&1 || continue
  SETTINGS_FILE="$candidate"
  break
done

# Not found in enabledPlugins — likely --plugin-dir dev mode, skip
[ -n "$SETTINGS_FILE" ] || exit 0
[ -f "$SETTINGS_FILE" ] || exit 0

# Fast path: check current state without modification
ACTUAL_CREATE=$(jq -r '[.hooks.WorktreeCreate[]?.hooks[]?.command // empty] | map(select(contains("worktree-plus"))) | .[0] // empty' "$SETTINGS_FILE" 2>/dev/null || true)
ACTUAL_REMOVE=$(jq -r '[.hooks.WorktreeRemove[]?.hooks[]?.command // empty] | map(select(contains("worktree-plus"))) | .[0] // empty' "$SETTINGS_FILE" 2>/dev/null || true)

if [ "$ACTUAL_CREATE" = "$EXPECTED_CREATE" ] && [ "$ACTUAL_REMOVE" = "$EXPECTED_REMOVE" ]; then
  exit 0
fi

# --- Needs update ---

SETTINGS=$(cat "$SETTINGS_FILE")

# Ensure .hooks key exists
if ! echo "$SETTINGS" | jq -e '.hooks' >/dev/null 2>&1; then
  SETTINGS=$(echo "$SETTINGS" | jq '.hooks = {}')
fi

CHANGES=()

configure_hook() {
  local HOOK_NAME="$1" EXPECTED_CMD="$2"

  local OUR_CMD
  OUR_CMD=$(echo "$SETTINGS" | jq -r \
    --arg name "$HOOK_NAME" \
    '[.hooks[$name][]?.hooks[]?.command // empty] | map(select(contains("worktree-plus"))) | .[0] // empty' \
    2>/dev/null || true)

  if [ -z "$OUR_CMD" ]; then
    local HAS_ANY
    HAS_ANY=$(echo "$SETTINGS" | jq -r --arg name "$HOOK_NAME" '.hooks[$name] // empty')
    if [ -z "$HAS_ANY" ]; then
      SETTINGS=$(echo "$SETTINGS" | jq \
        --arg name "$HOOK_NAME" --arg cmd "$EXPECTED_CMD" \
        '.hooks[$name] = [{"hooks": [{"type": "command", "command": $cmd}]}]')
    else
      SETTINGS=$(echo "$SETTINGS" | jq \
        --arg name "$HOOK_NAME" --arg cmd "$EXPECTED_CMD" \
        '.hooks[$name] += [{"hooks": [{"type": "command", "command": $cmd}]}]')
    fi
    CHANGES+=("added $HOOK_NAME")
  elif [ "$OUR_CMD" != "$EXPECTED_CMD" ]; then
    SETTINGS=$(echo "$SETTINGS" | jq \
      --arg name "$HOOK_NAME" --arg old "$OUR_CMD" --arg new "$EXPECTED_CMD" \
      '(.hooks[$name][]?.hooks[]? | select(.command == $old) | .command) = $new')
    CHANGES+=("updated $HOOK_NAME")
  fi
}

configure_hook "WorktreeCreate" "$EXPECTED_CREATE"
configure_hook "WorktreeRemove" "$EXPECTED_REMOVE"

if [ ${#CHANGES[@]} -gt 0 ]; then
  TEMP_FILE="${SETTINGS_FILE}.tmp.$$"
  echo "$SETTINGS" | jq '.' > "$TEMP_FILE"
  mv "$TEMP_FILE" "$SETTINGS_FILE"

  SUMMARY=$(IFS=', '; echo "${CHANGES[*]}")
  jq -n --arg msg "worktree-plus: auto-configured hooks in settings.json ($SUMMARY). Plugin hooks.json cannot fire WorktreeCreate before plugin load, so settings.json is used instead." \
    '{ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: $msg } }'
fi

# --- One-shot env-var → git config migration (v3.0.0) ---
# Legacy env vars: WORKTREE_BASE_BRANCH, WORKTREE_BRANCH_PREFIX.
# Migrate once per install; users who only used env vars as transient overrides
# won't get them silently pinned on every session.
#
# Flag location: ${CLAUDE_PLUGIN_DATA}/migrated-envvars
# The flag file's presence means migration already ran. Its content records the
# migration version + timestamp for forensic purposes — we don't parse it, we
# only check existence. Keeping the filename version-independent avoids needing
# a new filename on every future major bump.
PLUGIN_DATA="${CLAUDE_PLUGIN_DATA:-}"
MIGRATED=()
if [ -n "$PLUGIN_DATA" ]; then
  FLAG="${PLUGIN_DATA}/migrated-envvars"
  if [ ! -f "$FLAG" ]; then
    mkdir -p "$PLUGIN_DATA"

    if [ -n "${WORKTREE_BASE_BRANCH:-}" ]; then
      if ! git config --get worktreeplus.baseBranch >/dev/null 2>&1; then
        if git config --global worktreeplus.baseBranch "$WORKTREE_BASE_BRANCH" 2>/dev/null; then
          MIGRATED+=("WORKTREE_BASE_BRANCH=$WORKTREE_BASE_BRANCH -> git config --global worktreeplus.baseBranch")
        else
          echo "worktree-plus: WARNING — failed to migrate WORKTREE_BASE_BRANCH to git config --global. Check \$HOME and git config permissions." >&2
        fi
      fi
    fi

    if [ -n "${WORKTREE_BRANCH_PREFIX+x}" ]; then
      # +x: detect even when set to empty string (explicit "no prefix")
      if ! git config --get worktreeplus.branchPrefix >/dev/null 2>&1; then
        # Preserve the legacy "-" join: old behavior was "${PREFIX}-${NAME}".
        # New behavior is literal, so append "-" when migrating a non-empty value.
        LEGACY="$WORKTREE_BRANCH_PREFIX"
        [ -n "$LEGACY" ] && LEGACY="${LEGACY}-"
        if git config --global worktreeplus.branchPrefix "$LEGACY" 2>/dev/null; then
          MIGRATED+=("WORKTREE_BRANCH_PREFIX='$WORKTREE_BRANCH_PREFIX' -> git config --global worktreeplus.branchPrefix='$LEGACY'")
        else
          echo "worktree-plus: WARNING — failed to migrate WORKTREE_BRANCH_PREFIX to git config --global. Check \$HOME and git config permissions." >&2
        fi
      fi
    fi

    # Record migration version + timestamp in the flag so we can forensically
    # confirm when/what ran if a user asks later. Format: "v<version> <iso8601>".
    echo "v3.0.0 $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$FLAG"

    if [ ${#MIGRATED[@]} -gt 0 ]; then
      MIG_SUMMARY=$(IFS=$'\n'; printf '%s\n' "${MIGRATED[@]}")
      jq -n --arg msg "worktree-plus v3: migrated legacy env vars to git config. Env vars are no longer read — unset them from your shell profile.
${MIG_SUMMARY}" \
        '{ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: $msg } }'
    fi
  fi
fi

exit 0
