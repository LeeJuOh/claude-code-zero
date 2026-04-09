---
name: claw-mo-manage
description: "Manage mo markdown viewer — check status, add/remove patterns and groups, stop servers, reset sessions. Use when user says claw-mo-manage, wants to check mo status, list running servers, stop a specific server, modify watch patterns, add or remove groups, or reset mo session."
allowed-tools: Bash, AskUserQuestion, Read, Write
---

# claw-mo-manage

Interactive management hub for mo markdown viewer. Shows current state and lets the user choose what to do.

For config schema, HTTP API, and groups: read `${PLUGIN_DIR}/references/shared.md`

## Steps

### 1. Gather State

Check prerequisite first: `command -v mo >/dev/null 2>&1` — if missing, tell user to install and stop.

Then run in parallel:
- `mo --status --json` — get all running servers
- Read `${PLUGIN_DATA_DIR}/config.json` — get all configured projects
- Get current project key: `git rev-parse --show-toplevel`

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
What would you like to do?
1) Add pattern
2) Remove pattern
3) Add/remove group
4) Stop a server
5) Reset session
```

Match config entries with running servers to show accurate status (● running / ○ stopped). Also list any running servers found by `mo --status --json` that are not in config (user may have started them manually).

### 3. AskUserQuestion

**IMPORTANT: Do NOT use the `options` parameter when presenting 5+ choices — Claude Code limits it to 4 items and throws a validation error. Embed the numbered list in the `question` text and accept the user's reply as a number.**

Ask what the user wants to do. Handle based on choice:

**1) Add pattern**:
1. Ask which group (show existing groups)
2. Ask the glob pattern
3. If server running → use HTTP API: `POST /_/api/patterns` with `{"pattern": "...", "group": "..."}`
4. Update config file
5. Confirm

**2) Remove pattern**:
1. Show current patterns per group
2. Ask which to remove
3. If server running → use HTTP API: `DELETE /_/api/patterns?pattern=...&group=...`
4. Update config file
5. Confirm

**3) Add/remove group**:
- **Add**: Ask group name and patterns → API if running → update config
- **Remove**: Show groups, ask which → remove patterns via API → update config (remove group key)

**4) Stop a server**:
1. Show all running servers (from `mo --status --json`) with index numbers:
   ```
   Running servers:
   1) :6342  project-a  docs(12) plans(3) default(2)
   2) :6367  project-b  specs(5)
   ```
2. Ask which server to stop (by number or port)
3. Run `mo --shutdown -p PORT`
4. Confirm shutdown

**5) Reset session**:
1. `echo "y" | mo --clear -p PORT`
2. Confirm reset

### 4. Loop or Exit

After completing an action, show the updated dashboard and ask if they want to do anything else. Exit when they're done.

## Gotchas

- **Never use `options` in AskUserQuestion for 5+ choices** — max 4 items; use a numbered list in question text instead
- Always pipe `y` to `mo --clear` — it prompts for confirmation and will hang without it
- Config is desired state — update config AND runtime (via API) together to keep them in sync
- Group names must be simple lowercase — they become URL path segments
- If server is not running, only update config (skip API calls)
- "Stop a server" only stops the process — config is preserved so `/claw-mo-up` can restart it later
