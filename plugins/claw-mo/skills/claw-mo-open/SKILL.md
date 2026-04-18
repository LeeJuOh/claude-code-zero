---
name: claw-mo-open
description: "Open a specific markdown file, directory, or piped content in mo. Use when the user wants to quickly view one markdown file, add a file to mo, pipe markdown to the viewer, or preview a specific document."
allowed-tools: Bash, Read, Write, AskUserQuestion
argument-hint: "file-or-dir | - | [--group name] [--stdin]"
---

# claw-mo-open

Add a specific file, directory, or piped markdown content to the running mo server and open the browser directly on that file.

For config schema, HTTP API, deep-linking, and browser opening: read `${CLAUDE_PLUGIN_ROOT}/references/shared.md`

## Arguments

- `$ARGUMENTS` — one of:
  - File path: `docs/spec.md`
  - Directory: `docs/` (added as a watch pattern)
  - `-` or `--stdin`: read markdown from stdin (e.g., `cat notes.md | /claw-mo-open -`)
  - Optional `--group <name>` to pin the target group (otherwise auto-detected)
- Examples:
  - `/claw-mo-open docs/spec.md`
  - `/claw-mo-open plans/ --group plans`
  - `some-tool | /claw-mo-open - --group scratch`

## Steps

1. **Parse `$ARGUMENTS`**:
   - Detect `--stdin` or a bare `-` → stdin mode
   - Otherwise resolve file/dir path with `realpath`
   - Extract `--group`; if absent, auto-detect from config (match the file path against each group's patterns, fall back to `default`)

2. **Prerequisites**: `command -v mo >/dev/null 2>&1`.

3. **Project key**: `git rev-parse --show-toplevel` (fallback: `$PWD`).

4. **Read config** from `${CLAUDE_PLUGIN_DATA}/config.json`.

5. **Check running server**: `mo --status --json` → is a server on `$PORT`?

6. **If server is running AND config exists** — verify sync before mutating:
   - Compare live group→patterns to saved config (see `shared.md`)
   - If drifted: tell the user that `/claw-mo-up` would clear+rebuild this runtime; ask whether to resync first or add into the drifted runtime
   - If they resync: clear, restart from config, then continue
   - If they decline: continue but warn the change won't survive the next `/claw-mo-up` unless config is updated

7. **Add the content** based on mode:

   **(a) File path, server running**:
   ```bash
   curl -s -X POST "http://localhost:$PORT/_/api/groups/$GROUP/files" \
     -H 'Content-Type: application/json' \
     -d "{\"path\": \"$(realpath file.md)\"}"
   ```

   **(b) Directory, server running**:
   ```bash
   curl -s -X POST "http://localhost:$PORT/_/api/patterns" \
     -H 'Content-Type: application/json' \
     -d "{\"pattern\": \"$(realpath dir)/**/*.md\", \"group\": \"$GROUP\"}"
   ```

   **(c) Stdin, server running**: mo's single-instance detection pushes stdin content to the running server automatically:
   ```bash
   cat | mo --no-open -p $PORT -t "$GROUP"
   ```

   **(d) Server NOT running**:
   - Has config → perform `/claw-mo-up` behavior first (restart if server reappears mid-flight), then retry step 7
   - No config → **quick-open with auto-config**:
     1. Auto-assign port: `echo $((6300 + $(echo "$PROJECT_ROOT" | cksum | cut -d' ' -f1) % 100))`
     2. Start mo:
        - File: `mo --no-open -p $PORT "$(realpath file.md)"`
        - Dir: `mo --no-open -p $PORT "$(realpath dir)"` (mo converts dir → `dir/*.md` watch)
        - Stdin: `cat | mo --no-open -p $PORT`
     3. Save minimal config to `${CLAUDE_PLUGIN_DATA}/config.json`:
        ```json
        { "PROJECT_ROOT": { "port": PORT, "groups": { "default": ["*.md"] } } }
        ```
     4. Tell the user: "Saved a minimal config. Run `/claw-mo-setup` to customize watch groups."

8. **Resolve deep-link URL** — try to open directly on the added file, not just the group:

   **File mode**:
   ```bash
   FILE_ID=$(curl -s "http://localhost:$PORT/_/api/groups" | python3 -c "
   import sys, json, os
   target = '$(realpath file.md)'
   for g in json.load(sys.stdin):
       for f in g.get('files', []):
           if f.get('path') == target:
               print(f['id']); break
   ")
   URL="http://localhost:$PORT/$GROUP"
   [ -n "$FILE_ID" ] && URL="$URL?file=$FILE_ID"
   ```

   **Stdin mode**: mo generates `stdin-<hash>.md`. Look up its ID the same way, matching by name prefix `stdin-`.

   **Directory mode**: no single file to link to; use `http://localhost:$PORT/$GROUP`.

9. **Open browser** using the cmux-preferred logic from `shared.md` (reuse existing surface if one targets this port).

10. **Report** — what was added (path or `stdin-<hash>.md`), which group, whether the session was reused/resynced, the resolved URL.

## Gotchas

- **HTTP API needs absolute paths** — always `realpath` before sending.
- **Compare live to config before reusing a running session** — matching port or group names alone doesn't prove correctness.
- **Drift warning is a feature**, not a chore: runtime-only additions get wiped by the next `/claw-mo-up` unless persisted through `/claw-mo-setup` or `/claw-mo-manage`.
- **Directory args ≠ watch patterns at the API layer**: the HTTP API requires you to form the glob (`dir/**/*.md`) explicitly. mo's CLI does that conversion for free when you pass a dir as a positional arg — that's why quick-open uses the CLI form.
- **Deep-linking falls back gracefully**: if the file ID lookup fails (file just added, async), opening `/GROUP` still works and the new file will appear in the sidebar via SSE.
- **Stdin content dedupes by hash**: piping the same content twice reuses the existing entry (`stdin-<hash>.md`).
- **`cat | mo` requires stdin to not be a TTY**. Fine when a pipe is present; fails silently if Claude somehow passes an interactive stdin. The shell pipe `cat | mo` forces non-TTY.
- **Quick-open saves a minimal config** so `/claw-mo-up`, `/claw-mo-down`, and `/claw-mo-manage` can find the session.
- **If the group doesn't exist in mo yet**, the API creates it. The group name becomes a URL path segment — keep it simple lowercase.
- **Adding a file already in mo is safe** — dedup by path.
