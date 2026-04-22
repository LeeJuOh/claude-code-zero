#!/usr/bin/env bash
# claw-mo autosync: PostToolUse hook.
# On .md Write/Edit/MultiEdit, POST the file to mo so it appears in the browser
# without waiting for fsnotify or /claw-mo-up. Silent on every failure.

set -uo pipefail

# Always exit 0 — never block the user's session.
trap 'exit 0' EXIT

# 1. Read hook payload from stdin.
PAYLOAD=$(cat)
FILE_PATH=$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.file_path // empty')
[ -z "$FILE_PATH" ] && exit 0

# 2. Filter to .md files only.
case "$FILE_PATH" in
  *.md) ;;
  *) exit 0 ;;
esac

# 3. Project key (git root, fallback to PWD).
PROJECT_ROOT=$(git -C "$(dirname "$FILE_PATH")" rev-parse --show-toplevel 2>/dev/null || pwd)

# 4. Config.
CONFIG="${CLAUDE_PLUGIN_DATA:-$HOME/.claude/plugins/data/claw-mo-claude-code-zero}/config.json"
[ -f "$CONFIG" ] || exit 0

# Extract this project's entry; handle v1 (patterns) and v2 (groups) shapes.
PROJECT_ENTRY=$(jq -c --arg p "$PROJECT_ROOT" '.[$p] // empty' "$CONFIG")
[ -z "$PROJECT_ENTRY" ] && exit 0

# 5. Opt-out check: autosync defaults to true, only skip if explicitly false.
AUTOSYNC=$(printf '%s' "$PROJECT_ENTRY" | jq -r '.autosync // true')
[ "$AUTOSYNC" = "false" ] && exit 0

PORT=$(printf '%s' "$PROJECT_ENTRY" | jq -r '.port // empty')
[ -z "$PORT" ] && exit 0

# 6. Is mo actually running on this port?
mo --status --json 2>/dev/null | jq -e --arg port ":$PORT" '
  [.[] | select(.status == "running") | select(.url | endswith($port))] | length > 0
' >/dev/null || exit 0

# 7. Resolve absolute path.
ABS_PATH=$(python3 -c "import os,sys;print(os.path.abspath(sys.argv[1]))" "$FILE_PATH" 2>/dev/null)
[ -z "$ABS_PATH" ] || [ ! -f "$ABS_PATH" ] && exit 0

# 8. Group match: first pattern whose absolute glob matches the file, else 'default'.
GROUP=$(python3 - "$PROJECT_ROOT" "$ABS_PATH" <<'PY' 2>/dev/null
import json, os, sys, fnmatch, pathlib
project_root, abs_path = sys.argv[1], sys.argv[2]
cfg_path = os.environ.get(
    "CLAUDE_PLUGIN_DATA",
    os.path.expanduser("~/.claude/plugins/data/claw-mo-claude-code-zero"),
) + "/config.json"
cfg = json.load(open(cfg_path))
entry = cfg.get(project_root, {})
groups = entry.get("groups")
if not groups and "patterns" in entry:
    groups = {"default": entry["patterns"]}
groups = groups or {}
for group, patterns in groups.items():
    for p in patterns:
        absp = p if os.path.isabs(p) else os.path.join(project_root, p)
        if fnmatch.fnmatch(abs_path, absp):
            print(group); sys.exit(0)
        try:
            if pathlib.PurePath(abs_path).match(absp):
                print(group); sys.exit(0)
        except ValueError:
            pass
print("default")
PY
)
GROUP=${GROUP:-default}

# 9. POST (idempotent). 2-second timeout; swallow all output.
curl -sS --max-time 2 \
  -X POST "http://localhost:$PORT/_/api/groups/$GROUP/files" \
  -H 'Content-Type: application/json' \
  -d "$(jq -cn --arg p "$ABS_PATH" '{path: $p}')" \
  >/dev/null 2>&1 || true

exit 0
