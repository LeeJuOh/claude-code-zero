# claw-mo Autosync Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the "write a new .md → manually run `/claw-mo-up` to make it show up" friction. When Claude Code writes or edits a markdown file in a project that has claw-mo configured with a running server, a `PostToolUse` hook pushes the file to mo's HTTP API so it appears in the browser immediately — no restart, no user action.

**Architecture:** One `PostToolUse` hook matching `Write|Edit|MultiEdit`. The hook script is deterministic shell (bash + jq + curl). It filters to `.md` files, reads the per-project config, verifies the mo server is actually running on the configured port, matches the file path against configured group patterns, and POSTs to `/_/api/groups/{group}/files`. That endpoint is idempotent on mo's side (`State.AddFile` dedupes by absolute path), so retries and duplicates are harmless. Every failure mode is a silent `exit 0` — the hook never blocks, warns, or interrupts the user's Claude session.

**Tech Stack:** Bash, jq, curl, python3 (for glob matching via `fnmatch`/`doublestar`-like behavior). No new dependencies beyond what the plugin already assumes (`mo`, python3 is already used in `shared.md` for status parsing).

**Why hooks are the right fit:**
- mo's own fsnotify covers files written by external editors (VSCode/Obsidian/etc).
- The hook covers files Claude itself writes — which is the case the user complained about, because plan/spec/doc authoring in Claude Code is the dominant workflow.
- Silent fsnotify miss recovery (`/claw-mo-up --restart`) stays as the fallback for drops from kernel event pressure or brand-new subdirectories.

---

## File Structure

**Create:**
- `plugins/claw-mo/hooks/hooks.json` — PostToolUse matcher for `Write|Edit|MultiEdit`
- `plugins/claw-mo/hooks/autosync.sh` — main script (shebang + `set -uo pipefail`; silent fail)

**Modify:**
- `plugins/claw-mo/references/shared.md` — add **Autosync** section (hook behavior, opt-out, debugging)
- `plugins/claw-mo/skills/claw-mo-setup/SKILL.md` — write `autosync: true` into new configs by default; mention behavior in the final report
- `plugins/claw-mo/skills/claw-mo-manage/SKILL.md` — add "Toggle autosync" under Server control
- `plugins/claw-mo/skills/claw-mo-up/SKILL.md` — one-line addendum: "Autosync handles new files while mo is running; run `/claw-mo-up` only for fsnotify miss recovery or to restart"
- `plugins/claw-mo/README.md` — Quick Start section notes autosync; add an "Autosync" short section before "Why `claw-mo-up` Restarts By Default"
- `plugins/claw-mo/.claude-plugin/plugin.json` — description adds "auto-sync on file write"
- `.claude-plugin/marketplace.json` — bump claw-mo `version` to `2.8.0` (minor: new feature, backwards compatible) and mirror the description

**No test files.** Hook is shell with side effects. Validation is manual: write a new .md inside a configured project with mo running, confirm it appears in mo without `/claw-mo-up`.

---

## Prerequisites — Read Before Starting

Read in order before touching code.

- `plugins/claw-mo/references/shared.md` (276 lines) — config schema, HTTP API surface, port hashing, status JSON parsing
- `plugins/claw-mo/skills/claw-mo-setup/SKILL.md` — how configs are written today; preserve that flow
- `plugins/claw-mo/skills/claw-mo-manage/SKILL.md` — two-step AskUserQuestion convention; follow it for the toggle
- `plugins/rubber-duck-tutor/hooks/post-write-plan.sh` — reference for PostToolUse stdin parsing style in this repo
- `plugins/rubber-duck-tutor/hooks/hooks.json` — reference for matcher syntax
- `references/mo/internal/server/server.go` lines 256-305 (`State.AddFile` idempotency), lines 1226-1241 (HTTP routes), lines 1814-1840 (`handleRestart`/`handleStatus`)
- `AGENTS.md` — coding style, Unix LF line endings, branch naming
- `docs/reference/gotchas.md` — hooks live at plugin root, not inside `.claude-plugin/`

**Environment assumptions:**
- Working directory: `/Users/kevin/Desktop/leejuoh/claude-code-zero`
- Branch: `develop` (never commit to `main`)
- mo ≥ the version currently installed via `brew install k1LoW/tap/mo`
- jq available (already assumed by the plugin)
- python3 available (already used by `shared.md` snippets)

---

## Task 1: Confirm baseline — new .md fails to appear without `/claw-mo-up`

**Files:** none (read-only verification).

- [ ] **Step 1: Ensure a running mo session for this repo**

```bash
# In the claude-code-zero repo root
# Assumes a claw-mo config exists for this project; if not, run /claw-mo-setup once
mo --status --json | jq '[.[] | select(.status=="running") | .url]'
# Expected: one URL for this project's port
```

- [ ] **Step 2: Create a new markdown file inside a watched directory**

```bash
PROJECT_ROOT=$(git rev-parse --show-toplevel)
echo '# autosync smoke' > "$PROJECT_ROOT/docs/autosync-smoke-$(date +%s).md"
```

- [ ] **Step 3: Confirm it does NOT appear in mo within 3 seconds**

```bash
PORT=$(jq -r '.["'$PROJECT_ROOT'"].port' "${CLAUDE_PLUGIN_DATA:-$HOME/.claude/plugins/data/claw-mo-claude-code-zero}/config.json")
sleep 3
curl -s "http://localhost:$PORT/_/api/groups" | jq '[.[] | .files[] | select(.name | test("autosync-smoke"))]'
# If fsnotify caught it, will be non-empty. If missed (the user's bug), empty array.
```

Record the outcome. If fsnotify already caught the file, the bug is intermittent — document that the hook is belt-and-suspenders. If it didn't, this is exactly the case the hook fixes.

- [ ] **Step 4: Delete the smoke file to keep the repo clean**

```bash
rm "$PROJECT_ROOT/docs/autosync-smoke-"*.md
```

---

## Task 2: Create `hooks/hooks.json`

**Files:**
- Create: `plugins/claw-mo/hooks/hooks.json`

- [ ] **Step 1: Write the matcher**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/autosync.sh"
          }
        ]
      }
    ]
  }
}
```

Notes:
- Matcher is a regex alternation — the Claude Code hooks spec accepts this form for `PostToolUse`.
- No `statusMessage`. The hook must be invisible on success; a status message every md write would be noise.
- No `if:` clause. `Write|Edit|MultiEdit` only fires on those exact tools; filtering `.md` happens inside the script.

- [ ] **Step 2: Validate with `claude plugin validate`**

```bash
unset CLAUDECODE && claude plugin validate ./plugins/claw-mo
```

Expected: pass. If it fails on the hook schema, cross-check `https://code.claude.com/docs/en/hooks.md` for current `matcher` syntax.

---

## Task 3: Create `hooks/autosync.sh`

**Files:**
- Create: `plugins/claw-mo/hooks/autosync.sh`

- [ ] **Step 1: Script skeleton**

```bash
#!/usr/bin/env bash
# claw-mo autosync: PostToolUse hook.
# On .md Write/Edit/MultiEdit, POST the file to mo so it appears in the browser
# without waiting for fsnotify or /claw-mo-up. Silent on every failure.

set -uo pipefail

# Always exit 0 — never block the user's session.
trap 'exit 0' EXIT

# 1. Read hook payload from stdin.
PAYLOAD=$(cat)
FILE_PATH=$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.file_path // empty')
[ -z "$FILE_PATH" ] && exit 0

# 2. Filter to .md files only.
case "$FILE_PATH" in
  *.md) ;;
  *) exit 0 ;;
esac

# 3. Project key (git root, fallback to PWD).
PROJECT_ROOT=$(git -C "$(dirname "$FILE_PATH")" rev-parse --show-toplevel 2>/dev/null || pwd)

# 4. Config.
CONFIG="${CLAUDE_PLUGIN_DATA:-$HOME/.claude/plugins/data/claw-mo-claude-code-zero}/config.json"
[ -f "$CONFIG" ] || exit 0

# Extract this project's entry; handle v1 (patterns) and v2 (groups) shapes.
PROJECT_ENTRY=$(jq -c --arg p "$PROJECT_ROOT" '.[$p] // empty' "$CONFIG")
[ -z "$PROJECT_ENTRY" ] && exit 0

# 5. Opt-out check: autosync defaults to true, only skip if explicitly false.
AUTOSYNC=$(printf '%s' "$PROJECT_ENTRY" | jq -r '.autosync // true')
[ "$AUTOSYNC" = "false" ] && exit 0

PORT=$(printf '%s' "$PROJECT_ENTRY" | jq -r '.port // empty')
[ -z "$PORT" ] && exit 0

# 6. Is mo actually running on this port?
mo --status --json 2>/dev/null | jq -e --arg port ":$PORT" '
  [.[] | select(.status == "running") | select(.url | endswith($port))] | length > 0
' >/dev/null || exit 0

# 7. Resolve absolute path.
ABS_PATH=$(python3 -c "import os,sys;print(os.path.abspath(sys.argv[1]))" "$FILE_PATH" 2>/dev/null)
[ -z "$ABS_PATH" ] || [ ! -f "$ABS_PATH" ] && exit 0

# 8. Group match: first pattern whose absolute glob matches the file, else 'default'.
GROUP=$(python3 - "$PROJECT_ROOT" "$ABS_PATH" <<'PY' 2>/dev/null
import json, os, sys, fnmatch, pathlib
project_root, abs_path = sys.argv[1], sys.argv[2]
cfg_path = os.environ.get(
    "CLAUDE_PLUGIN_DATA",
    os.path.expanduser("~/.claude/plugins/data/claw-mo-claude-code-zero"),
) + "/config.json"
cfg = json.load(open(cfg_path))
entry = cfg.get(project_root, {})
groups = entry.get("groups")
if not groups and "patterns" in entry:
    groups = {"default": entry["patterns"]}
groups = groups or {}
for group, patterns in groups.items():
    for p in patterns:
        absp = p if os.path.isabs(p) else os.path.join(project_root, p)
        if fnmatch.fnmatch(abs_path, absp):
            print(group); sys.exit(0)
        # Also try a doublestar-ish '**' → recursive match via pathlib
        try:
            if pathlib.PurePath(abs_path).match(absp):
                print(group); sys.exit(0)
        except ValueError:
            pass
print("default")
PY
)
GROUP=${GROUP:-default}

# 9. POST (idempotent). 2-second timeout; swallow all output.
curl -sS --max-time 2 \
  -X POST "http://localhost:$PORT/_/api/groups/$GROUP/files" \
  -H 'Content-Type: application/json' \
  -d "$(jq -cn --arg p "$ABS_PATH" '{path: $p}')" \
  >/dev/null 2>&1 || true

exit 0
```

Key design points:
- `trap 'exit 0' EXIT` — even unexpected errors cannot surface to the user.
- `set -uo pipefail` but NOT `-e` — we want to continue past failures, not abort.
- Glob matching uses python's `fnmatch` + `pathlib.match` for `**`. Not a perfect doublestar match, but covers the patterns `/claw-mo-setup` actually writes (`docs/**/*.md`, `*.md`, `plans/*.md`). Edge cases fall back to `default` group, which is the acceptable default.
- Hardcoded CLAUDE_PLUGIN_DATA fallback uses `claw-mo-claude-code-zero` because that's the installed name. If the plugin is installed under a different marketplace name the fallback is wrong, but `CLAUDE_PLUGIN_DATA` is set by the harness in practice.

- [ ] **Step 2: Make executable**

```bash
chmod +x plugins/claw-mo/hooks/autosync.sh
```

- [ ] **Step 3: LF line endings**

```bash
file plugins/claw-mo/hooks/autosync.sh
# Expected: "Bourne-Again shell script, ASCII text executable"
# If CRLF present: "with CRLF line terminators" — fix with:
#   sed -i '' 's/\r$//' plugins/claw-mo/hooks/autosync.sh
```

- [ ] **Step 4: Dry-run the script with a synthetic payload**

```bash
# With mo running and a real .md file in this repo
echo '{"tool_input":{"file_path":"'$(git rev-parse --show-toplevel)'/README.md"}}' \
  | bash plugins/claw-mo/hooks/autosync.sh
# Expected: exit 0, README.md appears in mo's default group (already was — confirm idempotency)
curl -s "http://localhost:$PORT/_/api/groups" | jq '[.[].files[] | select(.name=="README.md")] | length'
# Expected: 1 (exactly one, not two — dedup proof)
```

---

## Task 4: Update `references/shared.md` — add Autosync section

**Files:**
- Modify: `plugins/claw-mo/references/shared.md`

- [ ] **Step 1: Insert a new "## Autosync" section between "## Stdin Pipe (Quick-view)" and "## Gotchas"**

Content to write:

```markdown
## Autosync (PostToolUse hook)

When claw-mo is enabled, a `PostToolUse` hook fires on `Write|Edit|MultiEdit`. If the written file is `.md` AND the current project has a claw-mo config AND mo is running on the configured port, the hook POSTs the file to `/_/api/groups/{group}/files`. mo's `State.AddFile` dedupes by absolute path, so the call is idempotent.

**What this means for users:**
- Claude writes a plan/spec/doc → it shows up in mo's sidebar without `/claw-mo-up`.
- External editor writes → mo's fsnotify handles it (unchanged).
- fsnotify silent miss recovery → `/claw-mo-up` (`mo --restart`) is still the fix.

**Opt out per project** — add `"autosync": false` to the project entry in `${CLAUDE_PLUGIN_DATA}/config.json`:

```json
{
  "/path/to/project": {
    "port": 6342,
    "autosync": false,
    "groups": { "default": ["*.md"] }
  }
}
```

`/claw-mo-manage` → Server control → Toggle autosync flips this field without hand-editing the file.

**Group matching:** the hook tries each group's patterns in config order (absolute `fnmatch` + `pathlib.match` for `**`). First match wins; no match falls back to `default`. That's intentionally forgiving — an imperfect group assignment is better than dropping the file entirely.

**Debugging:** the hook swallows all errors by design. To trace a missing add:

```bash
echo '{"tool_input":{"file_path":"/abs/path/to/file.md"}}' \
  | bash -x ${CLAUDE_PLUGIN_ROOT}/hooks/autosync.sh
```

Watch the `+` trace for which early-exit branch fired.
```

- [ ] **Step 2: Add an autosync entry to the "Gotchas → mo CLI Behavior" list**

```markdown
- **Autosync covers Claude-written files only**: the PostToolUse hook fires on `Write|Edit|MultiEdit` tool calls — files created by an external editor still rely on mo's fsnotify. If an external write doesn't appear, run `/claw-mo-up` (restart forces a fresh scan).
```

---

## Task 5: Update `claw-mo-setup` — write `autosync: true` into new configs

**Files:**
- Modify: `plugins/claw-mo/skills/claw-mo-setup/SKILL.md`

- [ ] **Step 1: Step 8 ("Save config") — add autosync field**

Before:
```
8. **Save config** to `${CLAUDE_PLUGIN_DATA}/config.json` (create file if needed, merge if exists). Use v2 `groups` format.
```

After:
```
8. **Save config** to `${CLAUDE_PLUGIN_DATA}/config.json` (create file if needed, merge if exists). Use v2 `groups` format. Include `"autosync": true` on new entries so PostToolUse adds newly-written .md files to the running mo server without `/claw-mo-up`.
```

- [ ] **Step 2: Step 9 ("Offer to start") — add one line**

After the existing step 9 content, append:
```
- Also mention: "Autosync is on by default — when I write .md files here they'll show up in mo automatically while the server is running. Turn off per project via `/claw-mo-manage` → Server control → Toggle autosync."
```

- [ ] **Step 3: Gotchas — add**

```markdown
- **autosync defaults to true**: every new config entry ships with `"autosync": true`. The field is only read by the PostToolUse hook; no runtime effect when the server is stopped. Users can disable per project via `/claw-mo-manage`.
```

---

## Task 6: Update `claw-mo-manage` — add Toggle autosync action

**Files:**
- Modify: `plugins/claw-mo/skills/claw-mo-manage/SKILL.md`

- [ ] **Step 1: Step 3 — extend the "Server control" second-question options**

Before:
```
Options:
1. Refresh (re-scan filesystem, keep session) — runs `mo --restart`
2. Reset current session (clear saved state + restart empty, then rebuild from config)
3. Stop a server
```

After:
```
Options:
1. Refresh (re-scan filesystem, keep session) — runs `mo --restart`
2. Reset current session (clear saved state + restart empty, then rebuild from config)
3. Stop a server
4. Toggle autosync for this project (PostToolUse hook)
```

- [ ] **Step 2: Step 4 — add a new action block**

```markdown
**Toggle autosync**:
1. Read current `autosync` field (default `true` if absent)
2. Show current state: `Autosync is ON — .md writes by Claude are added to mo automatically.`
3. AskUserQuestion: flip it?
4. Update config file only — no runtime call needed; the hook reads the config on each fire
5. Confirm new state
```

- [ ] **Step 3: Gotchas — add**

```markdown
- **Autosync is read per fire, not cached**: flipping it takes effect on the next `Write|Edit|MultiEdit` — no need to restart mo or reload Claude. The hook re-reads config.json every invocation, so the toggle is effectively live.
```

---

## Task 7: Update `claw-mo-up` — one-line addendum about autosync

**Files:**
- Modify: `plugins/claw-mo/skills/claw-mo-up/SKILL.md`

- [ ] **Step 1: Top of "Steps" section, before "1. Prerequisites", add a note**

```markdown
> [!NOTE]
> With autosync enabled (default), `/claw-mo-up` is only needed to (a) start mo for the first time in a session, (b) recover from a silent fsnotify miss via `mo --restart`, or (c) reconcile a drifted runtime to saved config. Routine new-file visibility does not require a restart anymore.
```

- [ ] **Step 2: Gotchas — add**

```markdown
- **Autosync vs. `/claw-mo-up`**: the PostToolUse hook handles routine new-file visibility for files Claude writes. `/claw-mo-up` remains the fix when (a) mo isn't running yet, (b) fsnotify missed something an external editor wrote, or (c) config drifted. Don't run `/claw-mo-up` as a reflex on every new file — it's cheap but not free.
```

---

## Task 8: Update README.md

**Files:**
- Modify: `plugins/claw-mo/README.md`

- [ ] **Step 1: Quick Start — extend**

Before:
```
/claw-mo-setup     <- once: configure which .md files to watch, grouped
/claw-mo-up        <- every time after: restart + open browser
```

After:
```
/claw-mo-setup     <- once: configure which .md files to watch, grouped
/claw-mo-up        <- start server + open browser
                      (thereafter autosync picks up Claude-written files; run this again
                       only to recover a silent fsnotify miss or restart mo)
```

- [ ] **Step 2: Add new section "## Autosync" between "## How It Works in Practice" and "## Commands"**

```markdown
## Autosync

Once mo is running, claw-mo installs a `PostToolUse` hook that fires on `Write|Edit|MultiEdit`. If the written file is `.md` and inside a project with a claw-mo config, the hook POSTs it to mo's HTTP API — no restart, no `/claw-mo-up`. Addition is idempotent on the mo side (dedup by absolute path), so the hook is safe to fire on every edit.

External-editor writes still rely on mo's own `fsnotify` watcher (which handles the common case). Autosync exists to cover the one Claude Code-specific gap: a doc Claude itself just wrote should be visible immediately, not "after you remember to hit `/claw-mo-up`."

Opt out per project in `/claw-mo-manage` → Server control → Toggle autosync. The hook rereads config on every fire, so toggling is live.
```

- [ ] **Step 3: "Why `claw-mo-up` Restarts By Default" — append a sentence**

At the end of that section:
```
With autosync on, routine new-file visibility for Claude-written files doesn't rely on fsnotify at all — the hook POSTs directly. `mo --restart` remains the recovery path for genuine fsnotify drops (new subdirectories, external-editor bursts, OS pressure).
```

---

## Task 8.5: Update root README.md — marketplace-facing claw-mo summary

**Files:**
- Modify: `README.md` (repo root, line 51 — the plugin table row for claw-mo)

The root README lists every plugin with a one-sentence pitch. The current claw-mo row leads with "restart-by-default so `fsnotify` drops never silently hide new files" — that framing is now secondary; autosync is the headline capability.

- [ ] **Step 1: Rewrite the claw-mo row (line 51)**

Before:
```
| [claw-mo](plugins/claw-mo/README.md) | Markdown live preview via [mo](https://github.com/k1LoW/mo) — Mermaid, KaTeX, and Shiki rendering that `cmux markdown open` can't do. One command per project: tabs grouped by directory, deep-link to any file, pipe generated markdown in (`some-tool \| /claw-mo-open -`), or open a file with zero setup. Full-text search across watched docs, a cross-project status dashboard, and restart-by-default so `fsnotify` drops never silently hide new files |
```

After:
```
| [claw-mo](plugins/claw-mo/README.md) | Markdown live preview via [mo](https://github.com/k1LoW/mo) — Mermaid, KaTeX, and Shiki rendering that `cmux markdown open` can't do. One command per project: tabs grouped by directory, deep-link to any file, pipe generated markdown in (`some-tool \| /claw-mo-open -`), or open a file with zero setup. Full-text search across watched docs, a cross-project status dashboard, and autosync-on-write so Claude-created docs appear in mo without a restart (fsnotify-miss recovery still one `/claw-mo-up` away) |
```

- [ ] **Step 2: Verify table formatting**

```bash
grep -n "claw-mo\|claw-mux" README.md | head -5
# Confirm pipe `|` count still balances; markdown table parsers are picky.
```

- [ ] **Step 3: If a plugin count / summary block elsewhere in the README mentions claw-mo, leave it alone**

No further root-README edits unless the summary references "restart" or "manual refresh" phrasing directly. Surgical change rule: don't rewrite neighboring rows.

---

## Task 9: Bump version + update descriptions

**Files:**
- Modify: `plugins/claw-mo/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: `plugin.json` description**

Old:
```json
"description": "Manage mo markdown viewer sessions: group-based organization, restart-on-up for reliable rescans, file deep-linking, stdin pipe support, cmux browser integration, per-project watch patterns, port isolation",
```

New:
```json
"description": "Manage mo markdown viewer sessions: autosync new Claude-written .md via PostToolUse hook, group-based organization, restart-on-up for fsnotify-miss recovery, file deep-linking, stdin pipe support, cmux browser integration, per-project watch patterns, port isolation",
```

- [ ] **Step 2: `marketplace.json` — bump + mirror**

```json
{
  "name": "claw-mo",
  "source": "./plugins/claw-mo",
  "version": "2.8.0",
  "description": "Manage mo markdown viewer sessions: autosync new Claude-written .md via PostToolUse hook, group-based organization, restart-on-up for fsnotify-miss recovery, file deep-linking, stdin pipe support, cmux browser integration, per-project watch patterns, port isolation",
  "category": "lab"
}
```

`2.8.0` is a minor bump: new feature, no breaking interface change. Existing configs without `autosync` field still work (defaults to true via the `// true` fallback in the hook).

- [ ] **Step 3: `claude plugin validate`**

```bash
unset CLAUDECODE && claude plugin validate ./plugins/claw-mo
```

Expected: pass.

---

## Task 10: End-to-end smoke test

**Files:** none (validation only).

- [ ] **Step 1: Reload the plugin locally**

```bash
claude plugin disable claw-mo@claude-code-zero
claude plugin enable claw-mo@claude-code-zero
```

- [ ] **Step 2: Start a fresh Claude Code session in this repo**

Fresh session is required because hooks load on session start.

- [ ] **Step 3: Create a new .md via Claude Write**

Ask Claude to write a new file like `docs/autosync-e2e-$(date +%s).md` with some content.

- [ ] **Step 4: Confirm it appears in mo within ~1 second**

```bash
PORT=$(jq -r --arg p "$(git rev-parse --show-toplevel)" '.[$p].port' \
  "${CLAUDE_PLUGIN_DATA:-$HOME/.claude/plugins/data/claw-mo-claude-code-zero}/config.json")
curl -s "http://localhost:$PORT/_/api/groups" | jq '[.[].files[] | select(.name | test("autosync-e2e"))]'
# Expected: one entry, the file Claude just wrote
```

- [ ] **Step 5: Confirm opt-out works**

```bash
# Edit config to set autosync:false for this project
jq --arg p "$(git rev-parse --show-toplevel)" '.[$p].autosync = false' \
  "${CLAUDE_PLUGIN_DATA:-$HOME/.claude/plugins/data/claw-mo-claude-code-zero}/config.json" \
  > /tmp/cfg.json && mv /tmp/cfg.json \
  "${CLAUDE_PLUGIN_DATA:-$HOME/.claude/plugins/data/claw-mo-claude-code-zero}/config.json"

# Ask Claude to write another .md
# Confirm it does NOT appear without /claw-mo-up
```

Flip back to `true` when done.

- [ ] **Step 6: Cleanup**

```bash
rm "$(git rev-parse --show-toplevel)"/docs/autosync-e2e-*.md
```

---

## Task 11: Commit

**Files:** none — commit-only.

- [ ] **Step 1: Stage and commit on `develop`**

```bash
git checkout develop  # if not already
git add plugins/claw-mo/ .claude-plugin/marketplace.json docs/superpowers/plans/2026-04-22-claw-mo-autosync-hook.md
git status  # verify nothing unintended
git diff --cached --stat
```

- [ ] **Step 2: Commit with English message**

Subject + one short body sentence:
```
claw-mo: add PostToolUse autosync hook

When Claude writes or edits a .md file inside a project with a running
mo server, a PostToolUse hook POSTs it to /_/api/groups/{group}/files so
the sidebar updates without a restart. Idempotent on mo's side; opt out
per project via claw-mo-manage or config.
```

No `Co-Authored-By`. No auto-push — wait for explicit request.

- [ ] **Step 3: Confirm `develop` advances, `main` untouched**

```bash
git log main..develop --oneline | head
git log develop..main --oneline | head
# Expected: the new commit on develop; main is behind, no extra commits on main
```

---

## Out of Scope (explicit)

- **Debouncing / rate limiting** — `AddFile` is O(n) on files in group and O(1) on dedup. At typical scale (hundreds of files) a single POST is sub-millisecond on the mo side. No debounce needed.
- **Deletes / renames** — mo's fsnotify handles these. Adding a DELETE pre-hook that fires on Bash(`rm ...`) is too brittle (shell expansions, `find -delete`, etc.). Let mo's watcher do its job.
- **Watching non-Write tool calls** — `Bash` can write md files too (`echo ... > foo.md`, `sed -i`, etc.). Matching `Bash` and parsing `tool_input.command` for file targets is fragile. Explicitly out of scope — users running md-generating shell commands can still hit `/claw-mo-up` or rely on fsnotify.
- **Cross-plugin composition** — the hook does not talk to claw-mux or any other plugin. It only talks to mo's HTTP API.
- **Multi-project workspaces** — the hook uses `git rev-parse --show-toplevel` from the file's directory. A monorepo with nested claw-mo configs (one per submodule) is not a supported layout; the hook will pick the outermost repo and that repo's config only.

---

## Rollback

If the hook causes problems:

```bash
# Fast disable without uninstall
jq '. + {hooks: {}}' plugins/claw-mo/hooks/hooks.json > /tmp/h.json \
  && mv /tmp/h.json plugins/claw-mo/hooks/hooks.json
# Or simply delete plugins/claw-mo/hooks/hooks.json and restart the Claude session.
```

Per-project opt-out (no restart needed):

```bash
jq --arg p "$(git rev-parse --show-toplevel)" '.[$p].autosync = false' \
  "${CLAUDE_PLUGIN_DATA}/config.json" > /tmp/cfg.json \
  && mv /tmp/cfg.json "${CLAUDE_PLUGIN_DATA}/config.json"
```

Full revert: `git revert <commit-hash>` on `develop`.
