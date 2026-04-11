---
name: claw-mo-open
description: "Use when the user wants to open a specific markdown file or directory in mo, or add a targeted document to the current project's viewer session."
allowed-tools: Bash, Read, AskUserQuestion
argument-hint: "file-or-dir [--group name]"
---

# claw-mo-open

Quickly add a specific file or directory to the running mo server and open it in the browser.

For config schema, HTTP API, and browser opening: read `${CLAUDE_PLUGIN_ROOT}/references/shared.md`

## Arguments

- `$ARGUMENTS` — file path, directory, or glob pattern. Optional `--group` to specify target group.
- Examples: `/claw-mo-open docs/spec.md`, `/claw-mo-open plans/ --group plans`

## Steps

1. Parse `$ARGUMENTS` — extract file/dir path and optional `--group` name. If `--group` is not specified, auto-detect from config: find which configured group's patterns best match the file path (e.g., `docs/spec.md` → `docs` group if `docs/**/*.md` is configured). Fall back to `default` if no match.
2. Check prerequisites: `command -v mo >/dev/null 2>&1`
3. Get project key and read config from `${CLAUDE_PLUGIN_DATA}/config.json`
4. Resolve the file path to absolute: `realpath <path>`

5. If config exists and the server is already running on this port, compare the live groups to config groups before adding anything:
   - If they match, continue
   - If they differ, tell the user the session is out of sync and ask whether to restart it first
   - If the user chooses restart: clear the session, restart with `/claw-mo-up` behavior, then continue the add/open flow
   - If the user declines restart, continue only if they explicitly want to add into the current live session

6. **If server is running** (`mo --status --json` shows this port):
   - **File**: Use HTTP API to add it (group goes in the URL path, not body):
     ```bash
     curl -s -X POST "http://localhost:$PORT/_/api/groups/$GROUP/files" \
       -H 'Content-Type: application/json' \
       -d "{\"path\": \"$(realpath file.md)\"}"
     ```
   - **Directory**: Use HTTP API to add a watch pattern:
     ```bash
     curl -s -X POST "http://localhost:$PORT/_/api/patterns" \
       -H 'Content-Type: application/json' \
       -d "{\"pattern\": \"dir/**/*.md\", \"group\": \"$GROUP\"}"
     ```

7. **If server is NOT running**:
   - Has config → start server with `/claw-mo-up` behavior first, then add the file/dir
   - No config → quick-open without setup: auto-assign port using the hash method from shared.md (`6300 + hash % 100`), then `mo --no-open -p $PORT $(realpath <path>)` and open browser. Tell the user about `/claw-mo-setup` for persistent config.

8. Open browser to the specific group: `http://localhost:$PORT/$GROUP`

9. Report what was added, whether the existing session was reused or resynced, and where it opened

## Gotchas

- HTTP API needs absolute paths — always `realpath` before sending
- A running server on the configured port may still be stale — compare live groups to config before assuming it is safe to reuse
- If the user adds into an out-of-sync session without restarting, be explicit that runtime state may now differ further from saved config
- If the group doesn't exist in mo yet, the API creates it automatically
- Adding a file that's already in mo is safe — mo deduplicates by path
