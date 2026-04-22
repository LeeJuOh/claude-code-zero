#!/usr/bin/env bash
# claw-mo autosync: PostToolUse hook.
# On .md Write/Edit/MultiEdit, POST the file to mo so it appears in the browser
# without waiting for fsnotify or /claw-mo-up. Silent on every failure.

set -uo pipefail

# Always exit 0 — never block the user's session.
trap 'exit 0' EXIT

DATA_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.claude/plugins/data/claw-mo-claude-code-zero}"
LOG="$DATA_DIR/autosync.log"
mkdir -p "$DATA_DIR" 2>/dev/null
log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >> "$LOG" 2>/dev/null; }

# 0. Dependency check. Log once per missing dep, then exit silently.
for dep in jq python3 curl; do
  command -v "$dep" >/dev/null 2>&1 || { log "missing dep: $dep"; exit 0; }
done

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

# 3a. Guard: file must live under PROJECT_ROOT. Without this, a write to
# /tmp/foo.md with a non-git fallback to the current shell's $PWD could
# match an unrelated project's config and POST to the wrong mo server.
# Compare realpath'd forms — on macOS, /tmp ↔ /private/tmp symlinks otherwise
# cause logical paths (FILE_PATH) and physical paths (pwd) to disagree.
PROJECT_ROOT_REAL=$(python3 -c "import os,sys;print(os.path.realpath(sys.argv[1]))" "$PROJECT_ROOT" 2>/dev/null)
FILE_PATH_REAL=$(python3 -c "import os,sys;print(os.path.realpath(sys.argv[1]))" "$FILE_PATH" 2>/dev/null)
[ -z "$PROJECT_ROOT_REAL" ] || [ -z "$FILE_PATH_REAL" ] && exit 0
case "$FILE_PATH_REAL" in
  "$PROJECT_ROOT_REAL"/*) ;;
  *) exit 0 ;;
esac

# 4. Config. Match by realpath equivalence: a config key written from a
# logical path (e.g. /tmp/x) should still match a project root resolved to
# its physical form (e.g. /private/tmp/x). MATCHED_ROOT is the literal key
# from the config — used downstream so relative patterns resolve against
# the same root the user wrote into config.
CONFIG="$DATA_DIR/config.json"
[ -f "$CONFIG" ] || exit 0

LOOKUP=$(python3 - "$CONFIG" "$PROJECT_ROOT_REAL" <<'PY' 2>/dev/null
import json, os, sys
cfg_path, pr_real = sys.argv[1], sys.argv[2]
cfg = json.load(open(cfg_path))
for key, entry in cfg.items():
    try:
        if os.path.realpath(key) == pr_real:
            print(key)
            print(json.dumps(entry))
            sys.exit(0)
    except OSError:
        continue
sys.exit(1)
PY
)
[ -z "$LOOKUP" ] && exit 0
MATCHED_ROOT=$(printf '%s\n' "$LOOKUP" | sed -n '1p')
PROJECT_ENTRY=$(printf '%s\n' "$LOOKUP" | sed -n '2,$p')
[ -z "$MATCHED_ROOT" ] || [ -z "$PROJECT_ENTRY" ] && exit 0

# 5. Opt-out check: autosync defaults to true, only skip if explicitly false.
# Use plain `.autosync` (not `// true`) — jq's `//` operator treats both null
# AND false as falsy, so `.autosync // true` returns "true" even when the
# field is literally false. Plain access returns "null" when missing,
# which then doesn't match the "false" check below — same default behavior.
AUTOSYNC=$(printf '%s' "$PROJECT_ENTRY" | jq -r '.autosync')
[ "$AUTOSYNC" = "false" ] && exit 0

PORT=$(printf '%s' "$PROJECT_ENTRY" | jq -r '.port // empty')
[ -z "$PORT" ] && exit 0

# 6. Is mo actually running on this port? Use the same URL-regex parsing as
# shared.md so a port like 6342 doesn't accidentally match :46342.
mo --status --json 2>/dev/null | python3 -c "
import sys, json, re
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(1)
servers = data if isinstance(data, list) else data.get('servers', [])
port = $PORT
for s in servers:
    if s.get('status') != 'running':
        continue
    m = re.search(r':(\d+)\$', str(s.get('url', '')))
    if m and int(m.group(1)) == port:
        sys.exit(0)
sys.exit(1)
" 2>/dev/null || exit 0

# 7. Resolve absolute path. file_path from hook payload is documented absolute,
# but keep abspath for symlink-free normalization and the existence check below.
ABS_PATH=$(python3 -c "import os,sys;print(os.path.abspath(sys.argv[1]))" "$FILE_PATH" 2>/dev/null)
[ -z "$ABS_PATH" ] || [ ! -f "$ABS_PATH" ] && exit 0

# 8. Group match: first pattern wins. If nothing matches, the file isn't part
# of any watched group — restart wouldn't surface it either, so skip rather
# than dropping it into a phantom 'default' group.
GROUP=$(python3 - "$MATCHED_ROOT" "$ABS_PATH" <<'PY' 2>/dev/null
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
sys.exit(1)
PY
)
[ -z "$GROUP" ] && exit 0

# 9. POST (idempotent). 2-second timeout; log on failure.
HTTP_CODE=$(curl -sS --max-time 2 -o /dev/null -w '%{http_code}' \
  -X POST "http://localhost:$PORT/_/api/groups/$GROUP/files" \
  -H 'Content-Type: application/json' \
  -d "$(jq -cn --arg p "$ABS_PATH" '{path: $p}')" 2>/dev/null) || HTTP_CODE=000

case "$HTTP_CODE" in
  2*) ;;
  *) log "POST failed: port=$PORT group=$GROUP path=$ABS_PATH http=$HTTP_CODE" ;;
esac

exit 0
