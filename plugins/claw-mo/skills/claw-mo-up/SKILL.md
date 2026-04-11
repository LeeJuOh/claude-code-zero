---
name: claw-mo-up
description: "Use when mo is already configured for the current project and the user wants to start, reopen, or reuse the markdown viewer for that project."
allowed-tools: Bash, Read
---

# claw-mo-up

Start the mo markdown viewer server for the current project and open it in the browser.

For config schema, port logic, groups, and browser opening: read `${CLAUDE_PLUGIN_ROOT}/references/shared.md`

## Steps

1. Check prerequisites: `command -v mo >/dev/null 2>&1`
2. Get project key: `git rev-parse --show-toplevel` (fallback: `$PWD`)
3. Read config from `${CLAUDE_PLUGIN_DATA}/config.json` for this project key
4. No config found → tell user to run `/claw-mo-setup`, stop
5. If config has `patterns` (v1), migrate to `groups` format and save back
6. `mo --status --json` → check if server already running on this port
7. If a server is already running on this port, compare its live groups to config groups before deciding to reuse it:
   - If the same groups are already loaded, reuse the running session
   - If the live groups differ from config (for example, an old session restored different targets), tell the user that the running session is out of sync and ask whether to restart it
   - If the user approves restart: `printf 'y\n' | mo --clear -p PORT`, then start the configured groups from scratch
8. Not running (or just cleared) → start mo for each group sequentially:
   ```bash
   # First group starts the server
   mo --no-open -w 'pattern1' -w 'pattern2' --target groupName -p PORT
   # Subsequent groups add to the running server
   mo --no-open -w 'pattern3' --target anotherGroup -p PORT
   ```
9. Open browser:
   - cmux (`$CMUX_SURFACE_ID` set):
     1. Run `cmux list-pane-surfaces` (use `--json` too if needed) to inspect reusable browser surfaces in the current pane
     2. If an mo browser surface already exists, reuse it with the exact surface identifier returned by cmux (for example `surface:4`, not just `4`)
     3. Navigate that existing surface to `http://localhost:$PORT`
     4. Only call `cmux browser open` when no reusable mo browser surface exists
   - Non-cmux: `open "http://localhost:$PORT"`
10. Report: whether the session was reused or restarted, which groups are active, and the URL

## Gotchas

- Always `--no-open` when starting mo — the skill controls browser opening separately
- mo survives shell exit and uses single-instance detection — multiple starts are safe, but a reused session may contain stale groups from an earlier run
- Start groups sequentially, not in parallel — the first invocation must start the server before others can add to it
- Compare live groups against config before reusing a running port — matching port alone does not guarantee the right session contents
- In cmux, always run `cmux list-pane-surfaces` first to check for an existing browser surface at the mo URL before calling `cmux browser open` — `open` creates a new surface every time and stacks duplicate tabs
- When reusing a cmux browser surface, pass the exact identifier that cmux returns (for example `surface:4`) — using only the numeric suffix can fail with `Surface index not found`
