---
name: claw-mo-up
description: "Start or reopen the mo markdown viewer for the current project. Use when mo is already configured and the user wants to view docs, start mo, open documentation viewer, or preview markdown."
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
6. `mo --status --json 2>/dev/null` → check if server already running on this port
7. If a server is running on this port, compare live groups to config:
   - Extract group names from the JSON output for the matching port
   - Sort and compare against the sorted config group names
   - **Match** → reuse the running session, skip to step 9
   - **Mismatch** → tell the user which groups differ (e.g., "live: [docs, plans] vs config: [docs, plans, default]") and ask whether to restart
   - If user approves restart: `printf 'y\n' | mo --clear -p PORT`, then continue to step 8
8. Not running (or just cleared) → start mo for each group **sequentially**:
   ```bash
   # First group starts the server
   mo --no-open -w 'pattern1' -w 'pattern2' --target groupName -p PORT
   # Subsequent groups add to the running server
   mo --no-open -w 'pattern3' --target anotherGroup -p PORT
   ```
9. Open browser:
   - cmux (`$CMUX_SURFACE_ID` set):
     1. Run `cmux list-pane-surfaces` to inspect reusable browser surfaces in the current pane
     2. If an mo browser surface already exists, reuse it with the exact surface identifier (e.g., `surface:4` — do not strip the prefix)
     3. Navigate that existing surface to `http://localhost:$PORT`
     4. Only call `cmux browser open` when no reusable mo browser surface exists
   - Non-cmux: `open "http://localhost:$PORT"`
10. Report: whether the session was reused or restarted, which groups are active, and the URL

## Gotchas

- Always `--no-open` when starting mo — the skill controls browser opening separately
- Start groups sequentially, not in parallel — the first invocation must start the server before others can add to it
- mo auto-restores previous sessions from its backup file — a matching port alone does not guarantee a correct session. Always compare live groups to config.
- `printf 'y\n' | mo --clear` — the clear command prompts for confirmation. Always pipe `y`.
- In cmux, always check `cmux list-pane-surfaces` before calling `browser open` — `open` stacks duplicate tabs
- When reusing a cmux surface, pass the exact identifier (e.g., `surface:4` not just `4`)
