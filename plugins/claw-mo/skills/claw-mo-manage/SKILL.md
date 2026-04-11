---
name: claw-mo-manage
description: "Manage mo markdown viewer — check status, add/remove patterns and groups, stop servers, reset sessions. Use when the user says claw-mo-manage, wants to check mo status, modify watch patterns, or troubleshoot a running mo session."
allowed-tools: Bash, AskUserQuestion, Read, Write
---

# claw-mo-manage

Interactive management hub for mo markdown viewer. Shows current state and lets the user choose what to do.

For config schema, HTTP API, and groups: read `${CLAUDE_PLUGIN_ROOT}/references/shared.md`

## Steps

### 1. Gather State

Check prerequisite first: `command -v mo >/dev/null 2>&1` — if missing, tell user to install and stop.

Then run in parallel:
- `mo --status --json` — get all running servers
- Read `${CLAUDE_PLUGIN_DATA}/config.json` — get all configured projects
- Get current project key: `git rev-parse --show-toplevel`

For the current project, extract group names from the JSON output and compare against config group names:
- If the port is running and the live groups differ from config, mark the session as **out of sync**
- Show that mismatch in the dashboard before offering any action

### 2. Display Dashboard

Present a clear overview:

```
mo server status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
● project-a     :6342  running  docs(12) plans(3) default(2)
● project-b     :6367  running  specs(5)
○ project-c     :6315  stopped

Current project: project-a (:6342)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Match config entries with running servers to show accurate status (● running / ○ stopped). Also list any running servers found by `mo --status --json` that are not in config (user may have started them manually).

If the current project's configured groups and live groups differ, show an explicit warning:

```
⚠ current project is out of sync
configured: docs, articles, default
live: harness, docs, issues, skills, agents
recommended action: reset session, then restart with saved config
```

### 3. Ask What to Do

Use AskUserQuestion with a **two-step** approach to stay within the 4-option limit:

**First question** — category:
```
Options:
1. Modify patterns/groups (add, remove, rename)
2. Server control (stop, reset, restart)
```

**If "Modify patterns/groups"** → second question:
```
Options:
1. Add pattern to a group
2. Remove pattern from a group
3. Add new group
4. Remove group
```

**If "Server control"** → second question:
```
Options:
1. Stop a server
2. Reset current session (clear and restart)
```

If the session is out of sync and the user chose "Modify patterns/groups", recommend reset/restart first so changes apply to a known-good runtime state.

### 4. Handle Each Action

**Add pattern**:
1. Ask which group (show existing groups)
2. Ask the glob pattern
3. If server running → use HTTP API: `POST /_/api/patterns` with `{"pattern": "...", "group": "..."}`
4. Update config file
5. Confirm

**Remove pattern**:
1. Show current patterns per group
2. Ask which to remove
3. If server running → use HTTP API: `DELETE /_/api/patterns?pattern=...&group=...`
4. Update config file
5. Confirm

**Add group**:
Ask group name and patterns → API if running → update config

**Remove group**:
Show groups, ask which → remove patterns via API → update config (remove group key)

**Stop a server**:
1. Show all running servers (from `mo --status --json`) with their ports and projects
2. Ask which server to stop (by number or port)
3. Run `mo --shutdown -p PORT`
4. Confirm shutdown

**Reset session**:
1. `echo "y" | mo --clear -p PORT`
2. Ask if user wants to restart with saved config (equivalent to `/claw-mo-up`)
3. Confirm

### 5. Loop or Exit

After completing an action, show the updated dashboard and ask if they want to do anything else. Exit when they're done.

## Gotchas

- Always pipe `y` to `mo --clear` — it prompts for confirmation and will hang without it
- Config is desired state — update config AND runtime (via API) together to keep them in sync
- Compare live groups to config before assuming a running server is reusable — matching port alone is not enough
- If the session is out of sync, prefer reset/restart before making multiple runtime edits; otherwise stale groups persist
- Group names must be simple lowercase — they become URL path segments
- If server is not running, only update config (skip API calls)
- "Stop a server" only stops the process — config is preserved so `/claw-mo-up` can restart it later
