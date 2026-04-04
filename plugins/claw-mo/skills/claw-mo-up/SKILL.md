---
name: claw-mo-up
description: "Start mo markdown viewer server and open in browser. Use when user says claw-mo-up, wants to view docs, open documentation viewer, start mo, or preview markdown."
allowed-tools: Bash, Read
---

# claw-mo-up

Start the mo markdown viewer server for the current project and open it in the browser.

For config schema, port logic, groups, and browser opening: read `${PLUGIN_DIR}/references/shared.md`

## Steps

1. Check prerequisites: `command -v mo >/dev/null 2>&1`
2. Get project key: `git rev-parse --show-toplevel` (fallback: `$PWD`)
3. Read config from `${PLUGIN_DATA_DIR}/config.json` for this project key
4. No config found → tell user to run `/claw-mo-setup`, stop
5. If config has `patterns` (v1), migrate to `groups` format and save back
6. `mo --status --json` → check if server already running on this port
7. Not running → start mo for each group:
   ```bash
   # First group starts the server
   mo --no-open -w 'pattern1' -w 'pattern2' --target groupName -p PORT
   # Subsequent groups add to the running server
   mo --no-open -w 'pattern3' --target anotherGroup -p PORT
   ```
8. Open browser (cmux if `$CMUX_SURFACE_ID` set, else `open`)
9. Report: which groups started, how many patterns, the URL

## Gotchas

- Always `--no-open` when starting mo — the skill controls browser opening separately
- mo survives shell exit and uses single-instance detection — multiple starts are safe
- Start groups sequentially, not in parallel — the first invocation must start the server before others can add to it
