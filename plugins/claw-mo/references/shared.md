# claw-mo Shared Context

## Prerequisites

```bash
command -v mo >/dev/null 2>&1
```

If mo is not installed, tell the user: `brew install k1LoW/tap/mo` and stop.

## Config

Location: `${CLAUDE_PLUGIN_DATA}/config.json`

### v2 Schema (groups)

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

**Project key**: `git rev-parse --show-toplevel` (fallback: `$PWD` for non-git dirs).

**Port auto-assignment** (when no port in config):
```bash
echo $((6300 + $(echo "$PROJECT_ROOT" | cksum | cut -d' ' -f1) % 100))
```
Range 6300-6399. User can override during setup.

## Starting mo with Groups

Each group maps to a mo `--target`. Start the server by invoking mo once per group:

```bash
# First group starts the server
mo --no-open -w 'docs/**/*.md' --target docs -p $PORT

# Subsequent groups add to the running server
mo --no-open -w 'plans/*.md' --target plans -p $PORT
mo --no-open -w '*.md' --target default -p $PORT
```

mo uses single-instance detection — if a server is already running on the port, it adds files/patterns to it instead of spawning a new process.

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

## mo JSON Output

Use `--json` for reliable status checking:

```bash
# Check if server is running on port
mo --status --json 2>/dev/null
```

Returns JSON with running servers, their ports, PIDs, groups, and file counts.

## Browser Opening

Check cmux availability first, then fallback:

```bash
URL="http://localhost:$PORT"  # or http://localhost:$PORT/GROUP_NAME for a specific group

if [ -n "$CMUX_SURFACE_ID" ]; then
  cmux browser open "$URL"
else
  open "$URL"
fi
```

`cmux browser open` creates a **new browser surface** each time. To avoid duplicate browser tabs on repeated `/claw-mo-up` calls, prefer `cmux browser navigate` if a browser surface already exists:

```bash
# Reuse the exact surface identifier returned by cmux, e.g. "surface:4"
cmux browser "surface:4" navigate "$URL"
```

If `cmux list-pane-surfaces` shows `surface:4`, do not strip the `surface:` prefix. Passing just `4` can fail with `Surface index not found`.

For first-time setup, `cmux browser open-split` opens the browser alongside the terminal in a split pane — useful for side-by-side coding + docs viewing.

## Gotchas

- **`**/*.md` can explode**: Projects with vendored code, submodules, or cloned repos may contain thousands of .md files. During setup, always show the count before accepting `**/*.md`. Guide users toward specific include patterns instead.
- **Same port = merged session**: If two projects share a port, mo merges their files into one session. The hash-based port assignment prevents this, but verify with `mo --status --json` if something looks wrong.
- **Always `--no-open` when starting**: The skill controls browser opening separately (cmux vs open). Never let `mo` auto-open a browser on start.
- **mo survives shell exit**: mo runs as a background daemon. Don't start a new server without checking status first. Multiple starts should be safe (idempotent).
- **Config is desired state, not runtime state**: Users may add files to mo directly via CLI. The skill's config tracks what the plugin manages, not everything mo has loaded.
- **`echo "y" | mo --clear`**: The `--clear` command prompts for confirmation. Always pipe `y` to avoid hanging.
- **v1 config migration**: Always check for `patterns` key and migrate to `groups` format before processing. Write back migrated config.
- **HTTP API needs absolute paths**: When adding files via `/_/api/files`, always `realpath` the file path first.
- **Group name = URL path**: Group names become URL segments (`/docs`, `/plans`). Keep them simple lowercase — no spaces or special chars.
- **`--watch` and file arguments are mutually exclusive**: `mo --watch '*.md' README.md` fails. Use either `--watch` patterns or explicit file arguments, not both. Directory arguments are the exception — they work with `--watch`.
- **mo auto-restores previous sessions**: When starting a new server, mo restores its backup (`$XDG_STATE_HOME/mo/backup/mo-<port>.json`) and merges with CLI-specified files. This means files from a previous manual `mo` invocation may reappear. A matching port is not enough — compare the running session's groups to config before reusing it. Use `echo "y" | mo --clear -p $PORT` before starting if you need a clean slate.
- **cmux `browser open` creates a new surface each time**: Repeated `/claw-mo-up` calls will stack browser tabs. Use `cmux browser navigate` to reuse an existing browser surface when possible.
- **cmux also has `cmux markdown open <path>`**: Opens a single markdown file in a dedicated cmux panel. mo is better for multi-file watching with groups.
