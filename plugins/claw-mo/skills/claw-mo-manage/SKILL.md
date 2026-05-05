---
name: claw-mo-manage
description: "Manage mo markdown viewer — check status, add/remove patterns and groups, refresh, stop servers, reset. Use when checking mo status, modifying watch patterns, or troubleshooting."
allowed-tools: Bash, AskUserQuestion, Read, Write
---

# claw-mo-manage

Interactive management hub for mo markdown viewer. Shows current state and lets the user choose what to do — including a safe "refresh" that re-scans the filesystem without destroying the session.

For config schema, HTTP API, `--restart` vs `--clear` semantics, and CLI wrappers (`--unwatch`, `--close`): read `${CLAUDE_PLUGIN_ROOT}/references/shared.md`

## Steps

### 1. Gather State

Check prerequisite first: `command -v mo >/dev/null 2>&1`. If missing, tell the user to install and stop.

Then in parallel:
- `mo --status --json` — all running servers
- Read `${CLAUDE_PLUGIN_DATA}/config.json` — all configured projects
- Get current project key: `git rev-parse --show-toplevel`

For the current project, extract the live group→patterns mapping from the JSON output and compare it against saved config. Mark the session **out of sync** if they differ.

### 2. Display Dashboard

```
mo server status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
● project-a     :6342  running  docs(12) plans(3) default(2)
● project-b     :6367  running  specs(5)
○ project-c     :6315  stopped

Current project: project-a (:6342)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Match config entries to running servers for accurate status (● / ○). Also list any running servers found by `mo --status --json` that aren't in config (user may have started them manually).

If the current project's configured mapping and live mapping differ, show an explicit warning:

```
⚠ current project is out of sync
configured: {docs: [docs/**/*.md], default: [*.md]}
live: {docs: [/abs/path/docs/*.md], default: [/abs/path/*.md]}

what this means:
  - the running mo session is not watching the same patterns as saved config
  - the next `/claw-mo-up` will clear this runtime and rebuild it from saved config

recommended actions:
  - if saved config is correct → Server control → Reset session (or just run /claw-mo-up)
  - if saved config is outdated → Modify patterns/groups (add/remove), or re-run /claw-mo-setup
```

### 3. Ask What to Do

Use AskUserQuestion with a **two-step** approach to stay within the 4-option limit:

**First question** — category:
```
Options:
1. Modify patterns/groups (add, remove, rename)
2. Files (add, remove from view)
3. Server control (refresh, stop, reset, restart)
```

**If "Modify patterns/groups"** → second question:
```
Options:
1. Add pattern to a group
2. Remove pattern from a group
3. Add new group
4. Remove group
```

**If "Files"** → second question:
```
Options:
1. Add a file to a group (ad-hoc, like /claw-mo-open)
2. Close a file currently open in mo
```

**If "Server control"** → second question:
```
Options:
1. Refresh (re-scan filesystem, keep session) — runs `mo --restart`
2. Reset current session (clear saved state + restart empty, then rebuild from config)
3. Stop a server
4. Toggle autosync for this project (PostToolUse hook)
```

If the session is out of sync and the user chose "Modify patterns/groups", recommend Reset first so later changes apply on top of a known-good runtime.

### 4. Handle Each Action

All runtime mutations should use the **mo CLI** when there is a CLI equivalent (`-w`/`--unwatch`/`--close`/`--restart`). Fall back to the HTTP API only when no CLI path exists. Config file updates happen after the runtime mutation succeeds.

**Add pattern**:
1. Ask which group (show existing groups)
2. Ask the glob pattern
3. If server running: `mo --no-open -w "$PATTERN" -t "$GROUP" -p $PORT`
   - Otherwise skip the runtime step
4. Update config file
5. Confirm

**Remove pattern**:
1. Show current patterns per group
2. Ask which to remove
3. If server running: `mo --unwatch "$PATTERN" -t "$GROUP" -p $PORT`
   - mo accepts either the original glob or the absolute path form reported by `--status`
4. Update config file
5. Confirm

**Add group**:
Ask group name and one initial pattern → start it via `mo -w ... -t name -p $PORT` if running → update config

**Remove group**:
Show groups, ask which → `mo --unwatch` for every pattern in that group (group disappears when it has no files or patterns) → update config (remove group key)

**Add file (ad-hoc)**:
Delegate to `/claw-mo-open` logic (HTTP API POST to `/_/api/groups/$GROUP/files`). Warn this is runtime-only unless persisted.

**Close a file**:
1. `curl -s "http://localhost:$PORT/_/api/groups"` → list files in each group
2. Ask which file
3. `mo --close "$(realpath file)" -t "$GROUP" -p $PORT`
4. No config update needed (ad-hoc file, not a pattern)

**Refresh (re-scan)**:
1. `mo --restart -p $PORT` (no prompt, safe)
2. Verify with `mo --status --json` and report new file counts
3. This is the fix when docs exist on disk but don't appear in mo — same mechanism `/claw-mo-up` uses by default.

**Reset session**:
1. `printf 'y\n' | mo --clear -p $PORT`
2. Ask: "Restart with saved config now?" (equivalent to `/claw-mo-up`)
3. If yes, run the per-group start sequence from config

**Stop a server**:
1. Show all running servers (from `mo --status --json`) with their ports and projects
2. Ask which to stop (by number or port)
3. `mo --shutdown -p $PORT`
4. Confirm — note that config is preserved so `/claw-mo-up` can restart it later

**Toggle autosync**:
1. Read current `autosync` field (default `true` if absent)
2. Show current state: `Autosync is ON — .md writes by Claude are added to mo automatically.`
3. AskUserQuestion: flip it?
4. Update config file only — no runtime call needed; the hook reads the config on each fire
5. Confirm new state

### 5. Loop or Exit

After each action, show the updated dashboard and ask if they want another action. Exit when done.

## Gotchas

- **Prefer `mo --restart` over `--clear` for rescans** — restart preserves session; clear destroys the backup. The old "just clear everything" reflex wipes state that didn't need wiping.
- **Only `--clear` prompts for confirmation** — pipe `printf 'y\n'`. `--restart`, `--shutdown`, `--close`, `--unwatch` do not prompt.
- **Config is desired state** — always update config AND runtime (CLI or API) together when making a persistent change.
- **Compare full live group→patterns mapping to config** before assuming a running server is reusable — matching port or group names alone isn't enough.
- **If session is out of sync**, prefer Reset before multiple runtime edits; otherwise stale groups/patterns persist and `/claw-mo-up` will discard your runtime edits on the next invocation.
- **Group names must be simple lowercase** — they become URL path segments.
- **If the server is not running**, only update config — skip CLI/API calls.
- **"Close a file" only removes it from the view** — the file on disk is untouched and will be re-added if it matches a watch pattern and `mo --restart` runs.
- **"Stop a server" only stops the process** — config and backup are preserved so `/claw-mo-up` can restart it later.
- **`mo --unwatch` accepts both relative globs and absolute paths** (the form `--status` shows). Either works.
- **Autosync is read per fire, not cached**: flipping it takes effect on the next `Write|Edit|MultiEdit` — no need to restart mo or reload Claude. The hook re-reads config.json every invocation, so the toggle is effectively live.
