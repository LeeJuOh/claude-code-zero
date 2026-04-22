# claw-mo Shared Context

Single source of truth for all claw-mo skills. Read this once per session; do not duplicate into individual skills.

## Prerequisites

```bash
command -v mo >/dev/null 2>&1
```

If mo is not installed, tell the user: `brew install k1LoW/tap/mo` and stop.

## Config

Location: `${CLAUDE_PLUGIN_DATA}/config.json`

### Schema

```json
{
  "/Users/someone/project-a": {
    "port": 6342,
    "groups": {
      "docs": ["docs/**/*.md"],
      "plans": ["plans/*.md", "docs/plan/*.md"],
      "default": ["*.md", "CHANGELOG.md"]
    }
  }
}
```

### v1 Migration

If config has `patterns` (array) instead of `groups` (object), migrate on read:

```
{ "patterns": ["docs/**/*.md", "*.md"] }
→ { "groups": { "default": ["docs/**/*.md", "*.md"] } }
```

Write back the migrated format. Don't break existing configs.

## Common Operations

**Project key**: `git rev-parse --show-toplevel` (fallback: `$PWD` for non-git dirs).

**Port auto-assignment** (when no port in config):
```bash
echo $((6300 + $(echo "$PROJECT_ROOT" | cksum | cut -d' ' -f1) % 100))
```
Range 6300-6399. User can override during setup.

## Starting mo with Groups

Each group maps to a mo `--target`. Start the server by invoking mo once per group, **sequentially** (first group starts the server, subsequent groups add to it):

```bash
mo --no-open -w 'docs/**/*.md' --target docs -p $PORT
mo --no-open -w 'plans/*.md' --target plans -p $PORT
mo --no-open -w '*.md' --target default -p $PORT
```

mo uses single-instance detection — if a server is already running on the port, it adds files/patterns to it instead of spawning a new process.

## Server State: Three Primitives

mo exposes three distinct lifecycle primitives that the skills must use correctly. Mixing them up causes the "new files not showing" bug.

| Command | What it does | Session backup? | When to use |
|---|---|---|---|
| `mo --restart -p PORT` | Stops & restarts server process | **Preserved** — all files/groups/patterns come back, fsnotify watchers re-initialize, directory scan re-runs | User re-ran `/claw-mo-up`, docs exist on disk but not in mo, or you otherwise need a fresh re-scan with the same logical session |
| `mo --clear -p PORT` | Wipes saved session then restarts on empty state | **Destroyed** — group/pattern state is gone | Config drift detected and you need to rebuild runtime from saved config as source of truth |
| `mo --shutdown -p PORT` | Stops process, leaves session backup | Preserved (loads on next start) | Explicit user "stop" intent; `/claw-mo-down` |

> [!IMPORTANT]
> `mo --clear` prompts for confirmation and hangs without input. Always pipe `y`:
>
> ```bash
> printf 'y\n' | mo --clear -p $PORT
> ```

> [!NOTE]
> `mo --restart` does **not** prompt — safe to call directly.

## Decision Tree: What `/claw-mo-up` Should Do

```
┌─ mo --status --json shows server on this port?
│
├── NO → start mo per group (see "Starting mo with Groups"), open browser
│
└── YES → compare live group→patterns mapping to saved config
         │
         ├── MATCH → mo --restart -p PORT         (force re-scan, preserve session)
         │          ─ ensures new files on disk become visible
         │          ─ addresses silent fsnotify misses
         │
         └── DIFFER → printf 'y\n' | mo --clear   (rebuild from config as SoT)
                     then start per group again
```

Reasoning:
- Users run `/claw-mo-up` when they want to *see* current docs. Reusing silently is surprising when files are missing.
- `--restart` is cheap (<1s) and idempotent. No semantic risk.
- `--clear` is only for drift because it destroys the backup file — overkill for a plain re-scan.

## Checking Server Status and Sync

```bash
mo --status --json 2>/dev/null
```

Returns JSON with running servers, their ports, PIDs, groups, and file counts.

### Sync Comparison

Compare the full group→patterns mapping, not just group names. mo reports **absolute** patterns in status output, while config stores **relative** globs:

```bash
# Live map from server on PORT. `--status --json` returns a JSON array; each
# entry has `url` and `status` but no explicit `port` field — parse the URL.
# Entries with status "stopped" are session backups, not live servers — skip them.
LIVE_MAP=$(mo --status --json 2>/dev/null | python3 -c "
import sys, json, re
data = json.load(sys.stdin)
servers = data if isinstance(data, list) else data.get('servers', [])
out = {}
for s in servers:
    if s.get('status') != 'running':
        continue
    m = re.search(r':(\d+)$', str(s.get('url', '')))
    if not m or int(m.group(1)) != $PORT:
        continue
    for g in s.get('groups', []):
        out[g['name']] = sorted(g.get('patterns', []))
print(json.dumps(out, sort_keys=True))
")

# Configured map, normalized to absolute paths
CONFIG_MAP=$(python3 -c "
import json, os
cfg = json.load(open('${CLAUDE_PLUGIN_DATA}/config.json'))
proj = cfg.get('$PROJECT_ROOT', {})
root = '$PROJECT_ROOT'
out = {}
for group, patterns in proj.get('groups', {}).items():
    out[group] = sorted(
        p if os.path.isabs(p) else os.path.join(root, p)
        for p in patterns
    )
print(json.dumps(out, sort_keys=True))
")

[ "$LIVE_MAP" = "$CONFIG_MAP" ] && echo match || echo differ
```

## mo HTTP API

When the server is running, these endpoints exist. Prefer the **mo CLI** (`--unwatch`, `--close`, `--restart`) when available — it is the officially supported path and survives API changes.

```bash
BASE="http://localhost:$PORT"

# List all groups with files (used for deep-linking by file ID)
curl -s "$BASE/_/api/groups"

# Add a file to a group (group is in the URL path, not the body)
curl -s -X POST "$BASE/_/api/groups/docs/files" -H 'Content-Type: application/json' \
  -d "{\"path\": \"$(realpath file.md)\"}"

# Add a watch pattern (prefer `mo -w` CLI instead — same effect)
curl -s -X POST "$BASE/_/api/patterns" -H 'Content-Type: application/json' \
  -d "{\"pattern\": \"specs/**/*.md\", \"group\": \"specs\"}"

# Remove a watch pattern (prefer `mo --unwatch` CLI)
curl -s -X DELETE "$BASE/_/api/patterns?pattern=specs/**/*.md&group=specs"

# Server status (equivalent to `mo --status --json` but scoped to this port)
curl -s "$BASE/_/api/status"

# Full-text search (query param is `q`, not `query`; optional group + limit + context)
curl -s "$BASE/_/api/search?q=keyword&limit=10"
```

### CLI-first wrappers

```bash
# Remove a pattern from a group
mo --unwatch 'specs/**/*.md' -t specs -p $PORT

# Close a specific file (by path)
mo --close "$(realpath file.md)" -t docs -p $PORT
```

## Deep-linking to a Specific File

mo's frontend uses `?file=<id>` to select a file in the sidebar. IDs are the first 8 hex chars of SHA-256(absolute path):

```bash
FILE_ID=$(curl -s "http://localhost:$PORT/_/api/groups" | python3 -c "
import sys, json, os
target = os.path.abspath('$1')
for g in json.load(sys.stdin):
    for f in g.get('files', []):
        if f.get('path') == target:
            print(f['id']); sys.exit(0)
")

URL="http://localhost:$PORT/$GROUP"
[ -n "$FILE_ID" ] && URL="$URL?file=$FILE_ID"
```

If the file isn't in any group yet, add it first (see HTTP API), then re-query its ID.

## Browser Opening

Prefer cmux whenever it is reachable. `$CMUX_SURFACE_ID` alone is not a reliable signal — nested shells inside a cmux pane often lose it. Also check `command -v cmux`:

```bash
URL="http://localhost:$PORT"  # or with /$GROUP?file=$ID for deep links

if [ -n "$CMUX_SURFACE_ID" ] || command -v cmux >/dev/null 2>&1; then
  # see Surface Reuse below
  :
else
  open "$URL"
fi
```

### cmux Surface Reuse

`cmux browser open` creates a **new** browser surface each time — repeated calls stack tabs. To avoid duplicates:

1. Run `cmux list-pane-surfaces` to find an existing browser surface pointing at `localhost:$PORT`
2. Reuse it with the exact identifier (e.g., `surface:4` — keep the `surface:` prefix)
3. Navigate: `cmux browser "surface:4" navigate "$URL"`
4. Only call `cmux browser open` (or `open-split` for first-time split) when no reusable surface exists

## Stdin Pipe (Quick-view)

mo supports `cat file.md | mo` for piped content. The plugin's `/claw-mo-open -` routes stdin to mo, attaching it to the running server (or starting one). Content is deduped by hash; piping the same content twice reuses the entry.

```bash
# Inside /claw-mo-open when the first arg is `-` or --stdin
cat | mo --no-open -p $PORT -t "$GROUP"  # attaches or starts
```

## Autosync (PostToolUse hook)

When claw-mo is enabled, a `PostToolUse` hook fires on `Write|Edit|MultiEdit`. If the written file is `.md` AND the current project has a claw-mo config AND mo is running on the configured port, the hook POSTs the file to `/_/api/groups/{group}/files`. mo's `State.AddFile` dedupes by absolute path, so the call is idempotent.

**What this means for users:**
- Claude writes a plan/spec/doc → it shows up in mo's sidebar without `/claw-mo-up`.
- External editor writes → mo's fsnotify handles it (unchanged).
- fsnotify silent miss recovery → `/claw-mo-up` (`mo --restart`) is still the fix.

**Opt out per project** — add `"autosync": false` to the project entry in `${CLAUDE_PLUGIN_DATA}/config.json`:

```json
{
  "/path/to/project": {
    "port": 6342,
    "autosync": false,
    "groups": { "default": ["*.md"] }
  }
}
```

`/claw-mo-manage` → Server control → Toggle autosync flips this field without hand-editing the file.

**Group matching:** the hook tries each group's patterns in config order (absolute `fnmatch` + `pathlib.match` for `**`). First match wins; no match falls back to `default`. That's intentionally forgiving — an imperfect group assignment is better than dropping the file entirely.

**Debugging:** the hook swallows all errors by design. To trace a missing add:

```bash
echo '{"tool_input":{"file_path":"/abs/path/to/file.md"}}' \
  | bash -x ${CLAUDE_PLUGIN_ROOT}/hooks/autosync.sh
```

Watch the `+` trace for which early-exit branch fired.

## Gotchas

### Config & Port
- **Same port = merged session**: If two projects share a port, mo merges their files. The hash-based assignment prevents this, but verify with `mo --status --json` if something looks wrong.
- **Config is desired state for `/claw-mo-up`**: Users may add files to mo directly via CLI or `/claw-mo-open`, but `/claw-mo-up` reconciles the runtime back to saved config. Runtime-only additions do not persist unless the config is updated.
- **v1 config migration**: Always check for `patterns` key and migrate to `groups` format before processing. Write back migrated config.

### mo CLI Behavior
- **Always `--no-open` when starting**: The skill controls browser opening separately. Never let mo auto-open a browser.
- **mo survives shell exit**: mo runs as a background daemon. Don't start a new server without checking status first.
- **`printf 'y\n' | mo --clear`**: `--clear` prompts for confirmation. Always pipe `y`.
- **`--restart` does NOT prompt**: Safe to invoke directly, no pipe needed.
- **`--watch` and file arguments are mutually exclusive**: `mo --watch '*.md' README.md` fails. Use either watch patterns or explicit file arguments, not both. Directory arguments are the exception (converted to `dir/*.md`).
- **mo auto-restores previous sessions**: mo restores its backup and merges with CLI-specified files. A matching port alone doesn't guarantee a correct session — compare live groups to config before reusing.
- **fsnotify can silently miss new files**: Especially when new subdirectories appear under a non-recursive watch, or when the OS drops events under load. Treat `mo --restart` as the safe fix — that's why `/claw-mo-up` restarts by default.
- **Autosync covers Claude-written files only**: the PostToolUse hook fires on `Write|Edit|MultiEdit` tool calls — files created by an external editor still rely on mo's fsnotify. If an external write doesn't appear, run `/claw-mo-up` (restart forces a fresh scan).

### HTTP API
- **Absolute paths only**: When adding files via API, always `realpath` the path first.
- **Group name = URL path**: Group names become URL segments. Keep them simple lowercase — no spaces or special chars.
- **Prefer CLI over API for destructive ops**: Use `mo --unwatch` / `mo --close` rather than DELETE endpoints — CLI is the officially supported long-term path.

### cmux
- **`browser open` stacks tabs**: Repeated calls create new surfaces. Use `browser navigate` to reuse existing surfaces.
- **Surface identifier format**: Use the exact identifier from `cmux list-pane-surfaces` (e.g., `surface:4`, not just `4`).
- **cmux also has `cmux markdown open <path>`**: Opens a single markdown file in a dedicated cmux panel. mo is better for multi-file watching with groups.

### Pattern Safety
- **`**/*.md` can explode**: Projects with vendored code, submodules, or cloned repos may contain thousands of .md files. During setup, always show the count before accepting broad patterns.
