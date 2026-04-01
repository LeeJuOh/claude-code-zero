# claw-mo Shared Context

## Prerequisites

```bash
command -v mo >/dev/null 2>&1
```

If mo is not installed, tell the user: `brew install k1LoW/tap/mo` and stop.

## Config

Location: `${PLUGIN_DATA_DIR}/config.json`

```json
{
  "/Users/someone/project-a": {
    "port": 6342,
    "patterns": ["docs/**/*.md", "*.md"]
  }
}
```

**Project key**: `git rev-parse --show-toplevel` (fallback: `$PWD` for non-git dirs).

**Port auto-assignment** (when no port in config):
```bash
echo $((6300 + $(echo "$PROJECT_ROOT" | cksum | cut -d' ' -f1) % 100))
```
Range 6300-6399. User can override during setup.

## Browser Opening

Check cmux availability first, then fallback:

```bash
if [ -n "$CMUX_SURFACE_ID" ]; then
  cmux browser open "http://localhost:$PORT"
else
  open "http://localhost:$PORT"
fi
```

## Gotchas

- **`**/*.md` can explode**: Projects with vendored code, submodules, or cloned repos may contain thousands of .md files. During setup, always show the count before accepting `**/*.md`. Guide users toward specific include patterns instead.
- **Same port = merged session**: If two projects share a port, mo merges their files into one session. The hash-based port assignment prevents this, but verify with `mo --status --json` if something looks wrong.
- **Always `--no-open` when starting**: The skill controls browser opening separately (cmux vs open). Never let `mo` auto-open a browser on start.
- **mo survives shell exit**: mo runs as a background daemon. Don't start a new server without checking status first. Multiple starts should be safe (idempotent).
- **Config is desired state, not runtime state**: Users may add files to mo directly via CLI. The skill's config tracks what the plugin manages, not everything mo has loaded.
- **`echo "y" | mo --clear`**: The `--clear` command prompts for confirmation. Always pipe `y` to avoid hanging.
