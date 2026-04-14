---
name: claw-mo-open
description: "Open a specific file or directory in mo markdown viewer. Use when the user wants to quickly view a markdown file, add a file to mo, or preview a specific document."
allowed-tools: Bash, Read, Write, AskUserQuestion
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
3. Get project key: `git rev-parse --show-toplevel` (fallback: `$PWD`)
4. Read config from `${CLAUDE_PLUGIN_DATA}/config.json`
5. Resolve the file path to absolute: `realpath <path>`

6. If config exists and the server is already running on this port, compare the full live group→patterns mapping to saved config before adding:
   - If they match, continue
   - If they differ, tell the user that `/claw-mo-up` would automatically clear and rebuild this runtime from saved config
   - Ask whether they want to resync first or intentionally add into the current drifted runtime
   - If the user approves resync: clear and restart with configured groups, then continue
   - If the user declines, continue only if they explicitly want to add into the current live session and remind them the change will not survive the next `/claw-mo-up` unless config is updated

7. **If server is running** (`mo --status --json` shows this port):
   - **File**: Use HTTP API to add it (group goes in the URL path):
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

8. **If server is NOT running**:
   - Has config → start server with `/claw-mo-up` behavior first, then add the file/dir
   - No config → **quick-open with auto-config**:
     1. Auto-assign port using hash method: `echo $((6300 + $(echo "$PROJECT_ROOT" | cksum | cut -d' ' -f1) % 100))`
     2. Start mo: `mo --no-open -p $PORT $(realpath <path>)`
     3. Save a minimal config entry to `${CLAUDE_PLUGIN_DATA}/config.json` so other skills can find this session:
        ```json
        { "PROJECT_ROOT": { "port": PORT, "groups": { "default": ["*.md"] } } }
        ```
     4. Tell the user: "Saved a minimal config. Run `/claw-mo-setup` to customize watch groups."

9. Open browser to the specific group: `http://localhost:$PORT/$GROUP`

10. Report what was added, whether the existing session was reused or resynced, and where it opened

## Gotchas

- HTTP API needs absolute paths — always `realpath` before sending
- Compare the full live group→patterns mapping to config before reusing a running session — a matching port or group list alone doesn't guarantee correctness
- If the user adds into an out-of-sync session without restarting, be explicit that runtime state may now differ from saved config and will be discarded by the next `/claw-mo-up` unless they persist it through config
- If the group doesn't exist in mo yet, the API creates it automatically
- Adding a file that's already in mo is safe — mo deduplicates by path
- Quick-open now saves a minimal config so `/claw-mo-up`, `/claw-mo-down`, and `/claw-mo-manage` can detect the session
