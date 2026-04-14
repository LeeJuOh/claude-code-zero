# claw-mo Shared Context

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

### Common Operations

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

## Checking Server Status and Sync

```bash
mo --status --json 2>/dev/null
```

Returns JSON with running servers, their ports, PIDs, groups, and file counts.

### Sync Comparison

To determine if a running session matches saved config, compare the full group→patterns mapping, not just group names:

```bash
# Get live groups + patterns from the server on PORT
LIVE_MAP=$(mo --status --json 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
result = {}
for s in data.get('servers', []):
    if s.get('port') == $PORT:
        for g in s.get('groups', []):
            result[g['name']] = sorted(g.get('patterns', []))
print(json.dumps(result, sort_keys=True))
")

# Normalize configured patterns to absolute paths because mo status reports absolute patterns
CONFIG_MAP=$(python3 -c "
import json, os
cfg = json.load(open('${CLAUDE_PLUGIN_DATA}/config.json'))
proj = cfg.get('$PROJECT_ROOT', {})
root = '$PROJECT_ROOT'
normalized = {}
for group, patterns in proj.get('groups', {}).items():
    normalized[group] = sorted(
        p if os.path.isabs(p) else os.path.join(root, p)
        for p in patterns
    )
print(json.dumps(normalized, sort_keys=True))
")

# Compare
if [ "$LIVE_MAP" = "$CONFIG_MAP" ]; then
  echo "in sync"
else
  echo "out of sync"
  echo "live=$LIVE_MAP"
  echo "config=$CONFIG_MAP"
fi
```

If out of sync, `/claw-mo-up` should treat saved config as the desired state: clear the runtime and rebuild it from config before opening the browser.

## mo HTTP API

When the server is running, use the HTTP API for runtime file management (no restart needed):

```bash
BASE="http://localhost:$PORT"

# Add a file to a group (group is in the URL path, not the body)
curl -s -X POST "$BASE/_/api/groups/docs/files" -H 'Content-Type: application/json' \
  -d "{\"path\": \"$(realpath file.md)\"}"

# Add a watch pattern to a group
curl -s -X POST "$BASE/_/api/patterns" -H 'Content-Type: application/json' \
  -d "{\"pattern\": \"specs/**/*.md\", \"group\": \"specs\"}"

# Remove a watch pattern
curl -s -X DELETE "$BASE/_/api/patterns?pattern=specs/**/*.md&group=specs"

# Get server status
curl -s "$BASE/_/api/status"

# Get all groups with files
curl -s "$BASE/_/api/groups"

# Full-text search
curl -s "$BASE/_/api/search?query=keyword&limit=10"
```

## Browser Opening

Prefer cmux whenever it is reachable. `$CMUX_SURFACE_ID` alone is not a reliable signal — nested shells inside a cmux pane often lose it. Also check `command -v cmux`:

```bash
URL="http://localhost:$PORT"  # or http://localhost:$PORT/GROUP_NAME for a specific group

if [ -n "$CMUX_SURFACE_ID" ] || command -v cmux >/dev/null 2>&1; then
  cmux browser open "$URL"
else
  open "$URL"
fi
```

### cmux Surface Reuse

`cmux browser open` creates a **new browser surface** each time. To avoid duplicate browser tabs on repeated calls:

1. Run `cmux list-pane-surfaces` to check for an existing browser surface
2. If found, reuse it with the exact surface identifier (e.g., `surface:4` — do not strip the `surface:` prefix)
3. Navigate: `cmux browser "surface:4" navigate "$URL"`
4. Only call `cmux browser open` when no reusable mo browser surface exists

For first-time setup, `cmux browser open-split` opens the browser alongside the terminal in a split pane.

## Gotchas

### Config & Port
- **Same port = merged session**: If two projects share a port, mo merges their files. The hash-based assignment prevents this, but verify with `mo --status --json` if something looks wrong.
- **Config is desired state for `/claw-mo-up`**: Users may add files to mo directly via CLI or `/claw-mo-open`, but `/claw-mo-up` should reconcile the runtime back to saved config. Runtime-only additions do not persist unless the config is updated.
- **v1 config migration**: Always check for `patterns` key and migrate to `groups` format before processing. Write back migrated config.

### mo CLI Behavior
- **Always `--no-open` when starting**: The skill controls browser opening separately (cmux vs open). Never let mo auto-open a browser.
- **mo survives shell exit**: mo runs as a background daemon. Don't start a new server without checking status first.
- **`echo "y" | mo --clear`**: The `--clear` command prompts for confirmation. Always pipe `y` to avoid hanging.
- **`--watch` and file arguments are mutually exclusive**: `mo --watch '*.md' README.md` fails. Use either `--watch` patterns or explicit file arguments, not both. Directory arguments are the exception.
- **mo auto-restores previous sessions**: mo restores its backup and merges with CLI-specified files. A matching port alone doesn't guarantee a correct session — compare live groups to config before reusing.

### HTTP API
- **Absolute paths only**: When adding files via API, always `realpath` the path first.
- **Group name = URL path**: Group names become URL segments (`/docs`, `/plans`). Keep them simple lowercase — no spaces or special chars.

### cmux
- **`browser open` stacks tabs**: Repeated calls create new surfaces. Use `browser navigate` to reuse existing surfaces.
- **Surface identifier format**: Use the exact identifier from `cmux list-pane-surfaces` (e.g., `surface:4`, not just `4`).
- **cmux also has `cmux markdown open <path>`**: Opens a single markdown file in a dedicated cmux panel. mo is better for multi-file watching with groups.

### Pattern Safety
- **`**/*.md` can explode**: Projects with vendored code, submodules, or cloned repos may contain thousands of .md files. During setup, always show the count before accepting broad patterns.
