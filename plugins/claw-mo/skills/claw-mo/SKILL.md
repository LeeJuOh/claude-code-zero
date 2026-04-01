---
name: claw-mo
description: "Start, manage, and browse mo markdown viewer sessions for your project. Use when user says claw-mo, wants to view project markdown docs in browser, start mo server, manage doc viewing, or open documentation viewer."
allowed-tools: Bash, AskUserQuestion, Read, Write
argument-hint: "setup | status | stop | add | remove | reset"
---

# claw-mo

Manage mo markdown viewer sessions for the current project.

## Prerequisites

```bash
command -v mo >/dev/null 2>&1
```

If mo is not installed, tell the user: `brew install k1LoW/tap/mo` and stop.

## Config

Location: `${CLAUDE_PLUGIN_DATA}/config.json`

```json
{
  "/Users/someone/project-a": {
    "port": 6342,
    "patterns": ["docs/**/*.md", "*.md"]
  },
  "/Users/someone/project-b": {
    "port": 6317,
    "patterns": ["**/*.md"]
  }
}
```

**Project key**: `git rev-parse --show-toplevel` (fallback: `$PWD` for non-git dirs).

**Port auto-assignment** (when no port in config):
```bash
echo $((6300 + $(echo "$PROJECT_ROOT" | cksum | cut -d' ' -f1) % 100))
```
Range 6300-6399. User can override during setup.

## Subcommands

Route based on `$ARGUMENTS`. If empty or unrecognized, treat as the default (start + open).

### (no args) — Start + Open

1. Read config for current project
2. No config found → tell user to run `/claw-mo setup`, stop
3. `mo --status --json` → check if server already running on this port
4. Not running → start: `mo --no-open -w 'pattern1' -w 'pattern2' -p PORT`
5. Open browser (see Browser Opening below)

### setup

1. Get project root
2. Show file count: `find "$PROJECT_ROOT" -name '*.md' 2>/dev/null | wc -l` (warn if 500+)
3. List top-level directories with .md files: `find "$PROJECT_ROOT" -name '*.md' -not -path '*/node_modules/*' -not -path '*/.git/*' | sed "s|$PROJECT_ROOT/||" | cut -d/ -f1 | sort -u`
4. AskUserQuestion: which directories/patterns to watch
5. AskUserQuestion: custom port? (show auto-assigned default)
6. Save to config (create file if needed, merge if exists)
7. Offer to start the server now

### status

Run `mo --status` and display output.

### stop

Read port from config → `mo --shutdown -p PORT`.

### add

Pattern from rest of `$ARGUMENTS` after "add".

1. Append to config patterns array
2. If server running: `mo -w '<pattern>' -p PORT --no-open`
3. Confirm what was added

### remove

Pattern from rest of `$ARGUMENTS` after "remove".

1. Remove from config patterns array
2. If server running: `mo --unwatch '<pattern>' -p PORT`
3. Confirm what was removed

### reset

Read port from config → `echo "y" | mo --clear -p PORT`.

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
- **Always `--no-open` when starting**: The skill controls browser opening separately (cmux vs mo --open). Never let `mo` auto-open a browser on start.
- **mo survives shell exit**: mo runs as a background daemon. Don't start a new server without checking status first. Multiple `/claw-mo` calls should be safe (idempotent).
- **Config is desired state, not runtime state**: Users may add files to mo directly via CLI. The skill's config tracks what the plugin manages, not everything mo has loaded.
- **`echo "y" | mo --clear`**: The `--clear` command prompts for confirmation. Always pipe `y` to avoid hanging.
