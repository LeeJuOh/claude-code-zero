---
name: claw-mo-down
description: "Stop mo markdown viewer server for current project. Use when user says claw-mo-down, wants to stop mo, shut down doc viewer, or kill mo server."
allowed-tools: Bash, Read
---

# claw-mo-down

Stop the mo markdown viewer server for the current project.

## Steps

1. Get project key: `git rev-parse --show-toplevel` (fallback: `$PWD`)
2. Read config from `${PLUGIN_DATA_DIR}/config.json` for this project key
3. No config → tell user no mo server is configured for this project, stop
4. Run `mo --shutdown -p PORT`
5. Confirm shutdown

## Gotchas

- Config is preserved — shutdown only stops the server, it doesn't delete the project config. `/claw-mo-up` will restart with the same groups.
- If no server is running on that port, `mo --shutdown` exits silently (no error). Check `mo --status --json` first if you need to confirm it was actually running.
