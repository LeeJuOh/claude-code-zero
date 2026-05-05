---
name: claw-mo-down
disable-model-invocation: true
description: "Stop the mo markdown viewer server for the current project. Use when the user says claw-mo-down, wants to stop mo, shut down doc viewer, or kill mo server."
allowed-tools: Bash, Read
---

# claw-mo-down

Stop the mo markdown viewer server for the current project, with accurate reporting of whether it was actually running.

For config schema and `--shutdown` semantics: read `${CLAUDE_PLUGIN_ROOT}/references/shared.md`

## Steps

1. **Prerequisites**: `command -v mo >/dev/null 2>&1`. If missing, tell the user `brew install k1LoW/tap/mo` and stop.

2. **Project key**: `git rev-parse --show-toplevel` (fallback: `$PWD`).

3. **Read config** from `${CLAUDE_PLUGIN_DATA}/config.json`. If no entry for this project, tell the user no mo server is configured for this project and stop.

4. **Check actual running state**: `mo --status --json 2>/dev/null`. Look for a server whose port matches `$PORT`.
   - **Not running**: tell the user "mo is not running on :$PORT (nothing to stop). Config preserved." and stop.
   - **Running**: continue to step 5.

5. **Shutdown**: `mo --shutdown -p $PORT`

6. **Verify**: re-run `mo --status --json 2>/dev/null` and confirm the port is gone. Report the result:
   - Success → "Stopped mo on :$PORT. Config preserved — run `/claw-mo-up` to restart."
   - Still present → warn the user (rare; orphaned process) and suggest `kill <pid>` using the PID from status.

## Gotchas

- **Config is preserved** — shutdown only stops the server, it doesn't delete the project config. `/claw-mo-up` will restart with the same groups.
- **Backup file is preserved** too — next start auto-restores the session. Use `/claw-mo-manage` → Reset session (which runs `--clear`) if you want a clean slate.
- **If no server is running on that port, `mo --shutdown` exits silently** — that's why this skill checks `--status --json` first and reports accurately instead of always saying "shut down".
- **Don't shut down a server belonging to another project** — the config key is project-scoped, so this skill only touches the port registered for the current project key.
