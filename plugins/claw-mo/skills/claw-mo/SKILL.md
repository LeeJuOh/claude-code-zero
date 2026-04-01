---
name: claw-mo
description: "Start mo markdown viewer and open in browser. Use when user says claw-mo, wants to view docs, open documentation viewer, or start mo server."
allowed-tools: Bash, Read
---

# claw-mo

Start the mo markdown viewer server and open it in the browser.

For config schema, port logic, and browser opening: read `${PLUGIN_DIR}/references/shared.md`

## Steps

1. Check prerequisites: `command -v mo >/dev/null 2>&1`
2. Read config from `${PLUGIN_DATA_DIR}/config.json` for current project key (`git rev-parse --show-toplevel`)
3. No config found → tell user to run `/claw-mo-setup`, stop
4. `mo --status --json` → check if server already running on this port
5. Not running → start: `mo --no-open -w 'pattern1' -w 'pattern2' -p PORT`
6. Open browser (cmux if available, else `open`)

## Gotchas

- Always `--no-open` when starting mo — the skill controls browser opening separately (cmux vs `open`)
- mo survives shell exit — check status before starting a new server
