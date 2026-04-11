---
name: claw-mo-manage
description: "Use when the user wants to inspect the current mo session, compare runtime state to saved config, or make targeted changes to groups, patterns, or running servers."
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

For the current project, compare configured groups to the live groups reported by mo on the configured port:
- If the port is running and the live groups differ from config, mark the session as **out of sync**
- Show that mismatch in the dashboard before offering any action
- If the user tries to modify patterns/groups while the session is out of sync, recommend reset/restart first so config changes apply to a known-good runtime state

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

If the current project's configured groups and live groups differ, show an explicit warning such as:

```
⚠ current project is out of sync
configured: docs, articles, default
live: harness, docs, issues, skills, agents
recommended action: reset session, then restart with saved config
```

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
- A matching port does not guarantee a correct runtime session — compare live groups to config before assuming the current server is reusable
- If the session is out of sync, prefer reset/restart before making multiple runtime edits; otherwise you may preserve stale groups and confuse the next `/claw-mo-up`
- Group names must be simple lowercase — they become URL path segments
- If server is not running, only update config (skip API calls)
- "Stop a server" only stops the process — config is preserved so `/claw-mo-up` can restart it later
