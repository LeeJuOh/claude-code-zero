---
name: claw-mo-up
description: "Start or reopen the mo markdown viewer for the current project. Use when mo is already configured and the user wants to view docs, start mo, open documentation viewer, or preview markdown."
allowed-tools: Bash, Read, Write
argument-hint: "[--reuse]"
---

# claw-mo-up

Bring up the mo markdown viewer for the current project and open the browser. When a server is already running, **restart it by default** so new files on disk become visible (fsnotify can silently miss events).

For config schema, decision tree, `--restart` vs `--clear` semantics, and browser opening: read `${CLAUDE_PLUGIN_ROOT}/references/shared.md`

## Arguments

- `$ARGUMENTS` (optional)
  - `--reuse` — Skip `mo --restart` when live matches config. Use this when the running session is known-good and the user explicitly wants zero interruption.

## Steps

> [!NOTE]
> With autosync enabled (default), `/claw-mo-up` is only needed to (a) start mo for the first time in a session, (b) recover from a silent fsnotify miss via `mo --restart`, or (c) reconcile a drifted runtime to saved config. Routine new-file visibility does not require a restart anymore.

1. **Prerequisites**: `command -v mo >/dev/null 2>&1`. If missing, tell user `brew install k1LoW/tap/mo` and stop.

2. **Project key**: `git rev-parse --show-toplevel` (fallback: `$PWD`).

3. **Read config** from `${CLAUDE_PLUGIN_DATA}/config.json`. If no entry for this project, tell the user to run `/claw-mo-setup` and stop.

4. **v1 migration**: If the entry has `patterns` instead of `groups`, migrate to `groups` format and save back.

5. **Probe server**: `mo --status --json 2>/dev/null`. Extract the server whose port matches `$PORT`.

6. **Branch on state** — see the decision tree in `shared.md`:

   **(a) No server on this port** → start per group sequentially:
   ```bash
   mo --no-open -w 'pattern1' -w 'pattern2' --target groupName -p $PORT
   mo --no-open -w 'pattern3' --target anotherGroup -p $PORT
   ```

   **(b) Server running, live matches config**:
   - **Default**: `mo --restart -p $PORT` — fresh fsnotify scan, session preserved. This is the main fix for the "docs exist on disk but don't show up in mo" class of bug.
   - **If `--reuse` flag was passed**: skip restart, reuse as-is.

   **(c) Server running, live differs from config** (treat config as source of truth):
   1. Show a concise diff (groups added/removed, patterns changed) so the user sees why a clear is happening
   2. `printf 'y\n' | mo --clear -p $PORT`
   3. Start per group as in (a)
   4. Mention that ad-hoc runtime edits were discarded; persist via `/claw-mo-manage` or `/claw-mo-setup` next time

7. **Open browser** — prefer cmux whenever reachable. `$CMUX_SURFACE_ID` alone is not a reliable signal:

   - **cmux path** (`$CMUX_SURFACE_ID` set **OR** `command -v cmux`):
     1. `cmux list-pane-surfaces` to inspect existing surfaces
     2. If a surface already targets `localhost:$PORT`, reuse it: `cmux browser "surface:N" navigate "http://localhost:$PORT"` (keep the `surface:` prefix)
     3. Otherwise `cmux browser open "http://localhost:$PORT"` (or `open-split` for first-time split layout)

   - **Fallback**: `open "http://localhost:$PORT"`

8. **Report** what actually happened:
   - `started` / `restarted (fresh scan)` / `reused as-is` / `cleared + rebuilt (config drift)`
   - active groups + file counts (from `mo --status --json`)
   - the URL

## Gotchas

- **Restart is the default** because fsnotify can silently miss file creation events (new subdirectories, high load, macOS FSEvents coalescing). `mo --restart` is cheap (<1s), preserves the session, and forces a full re-scan. The old "reuse silently" behavior hid missing files.
- **Always `--no-open`** when starting mo — the skill controls browser opening separately.
- **Start groups sequentially, not in parallel** — the first invocation must start the server before others can add to it.
- **mo auto-restores previous sessions** from its backup file. A matching port alone does not guarantee a correct session. Always compare the full live group→patterns mapping to config; if it drifts, clear and rebuild.
- **mo status reports absolute patterns**; config stores relative globs. Normalize config patterns to absolute paths under the project root before comparing, and sort within each group so ordering differences don't create false mismatches.
- **`mo --restart` does NOT prompt** — safe to call directly. Only `--clear` needs `printf 'y\n' |`.
- **`/claw-mo-up` is the reconcile point**: ad-hoc runtime-only edits belong in `/claw-mo-manage` or `/claw-mo-setup` if they should persist.
- **Prefer cmux over `open`** whenever cmux is reachable. `$CMUX_SURFACE_ID` may be unset even inside a cmux pane (nested shells). Check `command -v cmux` too.
- **Reuse cmux surface** before `browser open` — `open` stacks duplicate tabs. Pass the exact identifier (e.g., `surface:4`, not `4`).
- **Autosync vs. `/claw-mo-up`**: the PostToolUse hook handles routine new-file visibility for files Claude writes. `/claw-mo-up` remains the fix when (a) mo isn't running yet, (b) fsnotify missed something an external editor wrote, or (c) config drifted. Don't run `/claw-mo-up` as a reflex on every new file — it's cheap but not free.
