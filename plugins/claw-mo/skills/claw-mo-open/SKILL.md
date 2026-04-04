---
name: claw-mo-open
description: "Open a specific file or directory in mo markdown viewer. Use when user wants to quickly view a markdown file, add a file to mo, or preview a specific document."
allowed-tools: Bash, Read
argument-hint: "<file-or-dir> [--group name]"
---

# claw-mo-open

Quickly add a specific file or directory to the running mo server and open it in the browser.

For config schema, HTTP API, and browser opening: read `${PLUGIN_DIR}/references/shared.md`

## Arguments

- `$ARGUMENTS` — file path, directory, or glob pattern. Optional `--group` to specify target group.
- Examples: `/claw-mo-open docs/spec.md`, `/claw-mo-open plans/ --group plans`

## Steps

1. Parse `$ARGUMENTS` — extract file/dir path and optional `--group` name (default: `default`)
2. Check prerequisites: `command -v mo >/dev/null 2>&1`
3. Get project key and read config from `${PLUGIN_DATA_DIR}/config.json`
4. Resolve the file path to absolute: `realpath <path>`

5. **If server is running** (`mo --status --json` shows this port):
   - **File**: Use HTTP API to add it:
     ```bash
     curl -s -X POST "http://localhost:$PORT/_/api/files" \
       -H 'Content-Type: application/json' \
       -d "{\"path\": \"$(realpath file.md)\", \"group\": \"$GROUP\"}"
     ```
   - **Directory**: Use HTTP API to add a watch pattern:
     ```bash
     curl -s -X POST "http://localhost:$PORT/_/api/patterns" \
       -H 'Content-Type: application/json' \
       -d "{\"pattern\": \"dir/**/*.md\", \"group\": \"$GROUP\"}"
     ```

6. **If server is NOT running**:
   - Has config → start server with `/claw-mo-up` behavior first, then add the file/dir
   - No config → quick-open without setup: `mo --no-open -p 6300 $(realpath <path>)` and open browser. Tell the user about `/claw-mo-setup` for persistent config.

7. Open browser to the specific group: `http://localhost:$PORT/$GROUP`

8. Report what was added and where

## Gotchas

- HTTP API needs absolute paths — always `realpath` before sending
- If the group doesn't exist in mo yet, the API creates it automatically
- Adding a file that's already in mo is safe — mo deduplicates by path
