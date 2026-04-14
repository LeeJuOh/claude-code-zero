# worktree-plus Configuration Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all `WORKTREE_*` env vars in favor of `worktreeplus.*` git config, add `worktreeplus.dirBase` for custom worktree path, fix the broken main-repo detection in remove hook, auto-migrate existing env vars with a one-shot flag, and add a `config` skill for users to manage settings.

**Architecture:** Three bash scripts (create/remove/setup-check) read/write git config instead of env vars. The setup-check SessionStart hook performs a one-time env→config migration guarded by a flag file in `${CLAUDE_PLUGIN_DATA}` so that transient env vars aren't accidentally made permanent. A new `config` skill wraps `git config` commands with destructive-action guardrails. Version bumps to 3.0.0 (major — env var interface removed).

**Tech Stack:** Bash, jq, git (2.5+ for worktree, 2.31+ not required — we avoid `--path-format`), Claude Code skill frontmatter.

---

## File Structure

**Modify:**
- `plugins/worktree-plus/hooks/scripts/worktree-create.sh` — replace env-var precedence with git-config-only reads, add `dirBase` path resolution
- `plugins/worktree-plus/hooks/scripts/worktree-remove.sh` — replace broken `--show-superproject-working-tree` / sed fallback with `--git-common-dir` traversal
- `plugins/worktree-plus/hooks/scripts/setup-check.sh` — add one-shot env→config migration with flag file
- `plugins/worktree-plus/README.md` — rewrite Configuration section, update Features table, replace symlink examples, document migration
- `plugins/worktree-plus/.claude-plugin/plugin.json` — update description
- `.claude-plugin/marketplace.json` — bump version to `3.0.0`, update description

**Create:**
- `plugins/worktree-plus/skills/worktree-config/SKILL.md` — new skill that exposes `git config worktreeplus.*` commands with guardrails

**No test files.** Plugin hooks are shell scripts with side effects against the filesystem / git state. Validation is manual via `claude plugin validate .` + real worktree create/remove.

---

## Prerequisites — Read Before Starting

Read in order before touching code. None of this is optional.

- `plugins/worktree-plus/hooks/scripts/worktree-create.sh` (181 lines) — full current behavior
- `plugins/worktree-plus/hooks/scripts/worktree-remove.sh` (103 lines) — note line 28-31 for the broken main-repo detection
- `plugins/worktree-plus/hooks/scripts/setup-check.sh` (99 lines) — note the `enabledPlugins` scope detection (line 20-33) and jq mutation pattern
- `plugins/worktree-plus/README.md` (73 lines) — current structure and phrasing conventions
- `AGENTS.md` — repo coding style, plugin gotchas, git workflow rules (branch naming, commit style, no `git add -f`, no `--no-verify`, no auto-push)
- `CLAUDE.md` — present-before-implement preference, surgical change rule

**Environment assumptions:**
- Working directory: `/Users/kevin/Desktop/leejuoh/claude-code-zero`
- Branch: `develop` (never commit to `main`)
- jq available (plugin prerequisite already)
- git 2.5+ (worktree support, `--git-common-dir` available since 2.5)

---

## Task 1: Confirm baseline behavior

**Files:** none (read-only verification)

- [ ] **Step 1: Record current version and description**

```bash
grep -B1 -A3 '"worktree-plus"' .claude-plugin/marketplace.json
# Expected: version "2.8.2"
```

- [ ] **Step 2: Verify test worktree can still be created and removed under current code**

```bash
# In a throwaway test repo (not the plugin repo), with worktree-plus installed:
cd /tmp && git init wp-smoke && cd wp-smoke
git commit --allow-empty -m "init"
# Trigger creation via Claude Code (EnterWorktree) or CLI --worktree
# Confirm: .claude/worktrees/<name> exists, branch is `worktree-<name>`
```

Expected: worktree created at `.claude/worktrees/<name>`, branch `worktree-<name>`. Record this as the baseline — the new code must reproduce it when no git config is set.

- [ ] **Step 3: Capture current env-var behavior for the migration test**

```bash
git config --global worktreeplus.baseBranch  # note existing global value, if any
git config --get worktreeplus.baseBranch      # note repo-local value — Kevin has "develop"
```

Write down what's currently set globally and per-repo. The migration must not overwrite these.

---

## Task 2: Rewrite `worktree-create.sh` — env removal + `dirBase`

**Files:**
- Modify: `plugins/worktree-plus/hooks/scripts/worktree-create.sh`

- [ ] **Step 1: Replace branch-prefix block (lines 24-34)**

Old (lines 24-34):
```bash
# Branch name: WORKTREE_BRANCH_PREFIX controls prefix
#   unset      -> "worktree-<name>"
#   =""        -> "<name>" (no prefix)
#   ="feat"    -> "feat-<name>"
if [ -z "${WORKTREE_BRANCH_PREFIX+x}" ]; then
  BRANCH="worktree-${NAME}"
elif [ -z "$WORKTREE_BRANCH_PREFIX" ]; then
  BRANCH="${NAME}"
else
  BRANCH="${WORKTREE_BRANCH_PREFIX}-${NAME}"
fi
```

New:
```bash
# Branch name: worktreeplus.branchPrefix controls the prefix.
#   unset  -> "worktree-<name>" (built-in default, matches Claude Code baseline)
#   =""    -> "<name>" (no prefix)
#   ="feat-" -> "feat-<name>" (literal — user controls the separator)
PREFIX=$(git -C "$PROJECT_ROOT" config --get worktreeplus.branchPrefix 2>/dev/null) || PREFIX="worktree-"
# --get returns exit 1 when unset, which set -e would trip on — guard with `|| fallback`.
# Literal join: `$PREFIX` is prepended as-is. If user wants "feat-xxx" they set "feat-".
BRANCH="${PREFIX}${NAME}"
```

Note the literal-prefix decision: `worktreeplus.branchPrefix=feat` now produces `featname` (no separator), not `feat-name`. This is the agreed behavior — maximum flexibility, explicit is better than implicit. Document this in the README.

- [ ] **Step 2: Replace worktree-dir assignment (line 36)**

Old:
```bash
WORKTREE_DIR="${PROJECT_ROOT}/.claude/worktrees/${NAME}"
```

New:
```bash
# Worktree directory base: worktreeplus.dirBase controls where worktrees live.
#   unset or empty  -> ".claude/worktrees" (relative to PROJECT_ROOT)
#   relative path   -> "$PROJECT_ROOT/<path>/<name>"
#   absolute path   -> "<path>/<name>" (verbatim)
# Strip trailing slash so joining doesn't produce "//".
DIR_BASE=$(git -C "$PROJECT_ROOT" config --get worktreeplus.dirBase 2>/dev/null) || DIR_BASE=""
[ -z "$DIR_BASE" ] && DIR_BASE=".claude/worktrees"
DIR_BASE="${DIR_BASE%/}"

case "$DIR_BASE" in
  '~'|'~/'*)
    echo "Error: worktreeplus.dirBase does not expand '~' — use an absolute path (e.g., \"\$HOME/worktrees\")." >&2
    exit 1
    ;;
  /*) WORKTREE_DIR="${DIR_BASE}/${NAME}" ;;
  *)  WORKTREE_DIR="${PROJECT_ROOT}/${DIR_BASE}/${NAME}" ;;
esac
```

Tilde expansion (`~/foo`) intentionally NOT supported — bash does tilde expansion at parse time, not on variable substitution. A value starting with `~` is explicitly rejected with a clear error (better than silently creating a literal `~/` directory). Users who want `$HOME` must use an absolute path. Document in README.

- [ ] **Step 3: Replace base-branch resolution (line 89)**

Old:
```bash
BASE="${WORKTREE_BASE_BRANCH:-$(git -C "$PROJECT_ROOT" config --get worktreeplus.baseBranch 2>/dev/null || echo HEAD)}"
```

New:
```bash
BASE=$(git -C "$PROJECT_ROOT" config --get worktreeplus.baseBranch 2>/dev/null) || BASE="HEAD"
```

- [ ] **Step 4: Verify no other `WORKTREE_*` env references remain in the file**

```bash
grep -n 'WORKTREE_' plugins/worktree-plus/hooks/scripts/worktree-create.sh
```

Expected output: only shell variables named `WORKTREE_DIR` (local), no `WORKTREE_BRANCH_PREFIX` or `WORKTREE_BASE_BRANCH`.

- [ ] **Step 5: Smoke test**

Still inside the throwaway test repo from Task 1:
```bash
# No config set — should match baseline
rm -rf .claude/worktrees  # clean slate
# Trigger worktree creation via Claude Code
# Expected: .claude/worktrees/foo, branch worktree-foo

# With dirBase set:
git config worktreeplus.dirBase ".worktrees"
# Trigger again — expected: .worktrees/bar, branch worktree-bar

# With branchPrefix:
git config worktreeplus.branchPrefix "feat-"
# Trigger — expected: .worktrees/baz, branch feat-baz

# With empty prefix:
git config worktreeplus.branchPrefix ""
# Trigger — expected: branch name is literal NAME (no prefix)
```

- [ ] **Step 6: Commit**

```bash
git add plugins/worktree-plus/hooks/scripts/worktree-create.sh
git commit -m "feat(worktree-plus): switch create.sh to git config only, add dirBase"
```

---

## Task 3: Rewrite `worktree-remove.sh` main-repo detection

**Files:**
- Modify: `plugins/worktree-plus/hooks/scripts/worktree-remove.sh`

**Context:** The current code uses `git rev-parse --show-superproject-working-tree`, which returns the submodule's superproject path — unrelated to worktree. It almost always returns empty, so the code falls back to `sed 's|/\.claude/worktrees/.*$||'`. Once `dirBase` is configurable, this sed is wrong. The fix is to use `--git-common-dir`, which returns the path to the shared `.git` directory; its parent is the main repo root.

- [ ] **Step 1: Replace main-repo detection (lines 27-31)**

Old:
```bash
# Find the main repository
PROJECT_ROOT=$(cd "$WORKTREE_PATH" && git rev-parse --show-superproject-working-tree 2>/dev/null || true)
if [ -z "$PROJECT_ROOT" ]; then
  PROJECT_ROOT=$(echo "$WORKTREE_PATH" | sed 's|/\.claude/worktrees/.*$||')
fi
```

New:
```bash
# Find the main repository via the shared .git directory.
# `git rev-parse --git-common-dir` returns the path (may be relative) to the
# .git directory shared across all worktrees. Its parent is the main repo root.
# --show-superproject-working-tree is unrelated (it's for submodules, not
# worktrees) and was always returning empty — the old sed fallback assumed the
# .claude/worktrees/ layout which no longer holds once dirBase is configurable.
GIT_COMMON=$(git -C "$WORKTREE_PATH" rev-parse --git-common-dir 2>/dev/null || true)
if [ -z "$GIT_COMMON" ]; then
  echo "Error: cannot locate main repo for worktree: $WORKTREE_PATH" >&2
  exit 1
fi
# git-common-dir may be relative — resolve against the worktree, then go up one.
PROJECT_ROOT=$(cd "$WORKTREE_PATH" && cd "$GIT_COMMON" && cd .. && pwd)
```

- [ ] **Step 2: Confirm no other `.claude/worktrees` hardcoding remains in the file**

```bash
grep -n 'claude/worktrees' plugins/worktree-plus/hooks/scripts/worktree-remove.sh
```

Expected: no matches.

- [ ] **Step 3: Smoke test removal under custom dirBase**

```bash
# Inside the test repo from Task 2 where dirBase=".worktrees" is set:
# Trigger WorktreeRemove on an existing worktree in .worktrees/
# Expected: clean removal, no "Error: cannot locate main repo"
# Expected: .worktree.log records REMOVED entry
```

Also test the classic path (no dirBase set, default `.claude/worktrees/`) to confirm no regression.

- [ ] **Step 4: Commit**

```bash
git add plugins/worktree-plus/hooks/scripts/worktree-remove.sh
git commit -m "fix(worktree-plus): use --git-common-dir for main repo detection"
```

---

## Task 4: Add one-shot env→config migration to `setup-check.sh`

**Files:**
- Modify: `plugins/worktree-plus/hooks/scripts/setup-check.sh`

**Context:** `WORKTREE_BRANCH_PREFIX=feat- claude -w` is a legitimate "one-off override" pattern. A naive migration would capture that transient value and pin it permanently. Guard with a flag file in `${CLAUDE_PLUGIN_DATA}` so migration runs once per user install — after that, env vars are fully ignored.

- [ ] **Step 1: Add migration block at the end of `setup-check.sh`, right before the final `exit 0`**

Insert after line 96 (after the `if [ ${#CHANGES[@]} -gt 0 ]` block, before `exit 0`):

```bash
# --- One-shot env-var → git config migration (v3.0.0) ---
# Legacy env vars: WORKTREE_BASE_BRANCH, WORKTREE_BRANCH_PREFIX.
# Migrate once per install; users who only used env vars as transient overrides
# won't get them silently pinned on every session.
#
# Flag location: ${CLAUDE_PLUGIN_DATA}/migrated-envvars
# The flag file's presence means migration already ran. Its content records the
# migration version + timestamp for forensic purposes — we don't parse it, we
# only check existence. Keeping the filename version-independent avoids needing
# a new filename on every future major bump.
PLUGIN_DATA="${CLAUDE_PLUGIN_DATA:-}"
MIGRATED=()
if [ -n "$PLUGIN_DATA" ]; then
  FLAG="${PLUGIN_DATA}/migrated-envvars"
  if [ ! -f "$FLAG" ]; then
    mkdir -p "$PLUGIN_DATA"

    if [ -n "${WORKTREE_BASE_BRANCH:-}" ]; then
      if ! git config --get worktreeplus.baseBranch >/dev/null 2>&1; then
        if git config --global worktreeplus.baseBranch "$WORKTREE_BASE_BRANCH" 2>/dev/null; then
          MIGRATED+=("WORKTREE_BASE_BRANCH=$WORKTREE_BASE_BRANCH -> git config --global worktreeplus.baseBranch")
        else
          echo "worktree-plus: WARNING — failed to migrate WORKTREE_BASE_BRANCH to git config --global. Check \$HOME and git config permissions." >&2
        fi
      fi
    fi

    if [ -n "${WORKTREE_BRANCH_PREFIX+x}" ]; then
      # +x: detect even when set to empty string (explicit "no prefix")
      if ! git config --get worktreeplus.branchPrefix >/dev/null 2>&1; then
        # Preserve the legacy "-" join: old behavior was "${PREFIX}-${NAME}".
        # New behavior is literal, so append "-" when migrating a non-empty value.
        LEGACY="$WORKTREE_BRANCH_PREFIX"
        [ -n "$LEGACY" ] && LEGACY="${LEGACY}-"
        if git config --global worktreeplus.branchPrefix "$LEGACY" 2>/dev/null; then
          MIGRATED+=("WORKTREE_BRANCH_PREFIX='$WORKTREE_BRANCH_PREFIX' -> git config --global worktreeplus.branchPrefix='$LEGACY'")
        else
          echo "worktree-plus: WARNING — failed to migrate WORKTREE_BRANCH_PREFIX to git config --global. Check \$HOME and git config permissions." >&2
        fi
      fi
    fi

    # Record migration version + timestamp in the flag so we can forensically
    # confirm when/what ran if a user asks later. Format: "v<version> <iso8601>".
    echo "v3.0.0 $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$FLAG"

    if [ ${#MIGRATED[@]} -gt 0 ]; then
      MIG_SUMMARY=$(IFS=$'\n'; printf '%s\n' "${MIGRATED[@]}")
      jq -n --arg msg "worktree-plus v3: migrated legacy env vars to git config. Env vars are no longer read — unset them from your shell profile.
${MIG_SUMMARY}" \
        '{ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: $msg } }'
    fi
  fi
fi

exit 0
```

Key design points:
- **Flag file** (`${CLAUDE_PLUGIN_DATA}/migrated-envvars`) ensures migration runs at most once even if user re-exports the env var later. Name is version-independent — file content (`v<ver> <timestamp>`) records which migration actually ran
- **Migration failures warn loudly**: if `git config --global` fails (e.g., read-only HOME, missing gitconfig), the script prints a stderr warning instead of silently giving up — users shouldn't be left wondering why their env var "disappeared"
- **`--global` scope** matches where env vars live (user shell, not per-repo)
- **`+x` check** on `WORKTREE_BRANCH_PREFIX` catches the explicit empty-string case (user who did `export WORKTREE_BRANCH_PREFIX=""` to disable prefix)
- **Legacy join translation**: old code did `${PREFIX}-${NAME}`, new code does `${PREFIX}${NAME}`. To preserve behavior, migrate `feat` → `feat-`. Empty string stays empty.
- **Skip if git config already set**: user who already ran `git config worktreeplus.baseBranch develop` keeps that value; env var doesn't override
- **Fail-soft**: all steps use `2>/dev/null` / `|| true`-equivalent patterns. If `git config --global` fails (e.g., no HOME), migration is skipped for that entry but flag is still touched — we don't retry forever.

- [ ] **Step 2: Verify the existing early-exit conditions still apply**

The migration block is at the end of the script, so the early exits at lines 14 (no jq), 15 (no PLUGIN_ROOT), and 33 (not in enabledPlugins) still bypass migration. This is intentional — dev mode (`--plugin-dir`) doesn't migrate.

Double-check by tracing the exits:
```bash
grep -n '^exit' plugins/worktree-plus/hooks/scripts/setup-check.sh
```
Expected: early exits preserved at the same lines, one final `exit 0` at the very bottom.

- [ ] **Step 3: Smoke test migration**

```bash
# Clear any prior migration:
rm -f "${CLAUDE_PLUGIN_DATA:-$HOME/.claude/plugins/data/worktree-plus-claude-code-zero}/migrated-envvars"

# Unset any pre-existing global config to simulate fresh user:
git config --global --unset worktreeplus.branchPrefix 2>/dev/null || true

# Start a session with env var set:
WORKTREE_BRANCH_PREFIX=feat claude
# Expected SessionStart message: "migrated legacy env vars to git config..."
# Verify:
git config --global --get worktreeplus.branchPrefix   # -> "feat-"
ls "${CLAUDE_PLUGIN_DATA}/migrated-envvars"           # -> exists
cat "${CLAUDE_PLUGIN_DATA}/migrated-envvars"          # -> "v3.0.0 <timestamp>"
```

Second-run idempotency:
```bash
# Same shell, new session:
claude
# Expected: NO migration message (flag exists)
# Changing env var doesn't re-trigger:
WORKTREE_BRANCH_PREFIX=bug claude
# Expected: still no migration message, global config unchanged at "feat-"
```

- [ ] **Step 4: Commit**

```bash
git add plugins/worktree-plus/hooks/scripts/setup-check.sh
git commit -m "feat(worktree-plus): one-shot env var to git config migration"
```

---

## Task 5: Create the `config` skill

**Files:**
- Create: `plugins/worktree-plus/skills/worktree-config/SKILL.md`

- [ ] **Step 1: Create skills directory**

```bash
mkdir -p plugins/worktree-plus/skills/worktree-config
```

- [ ] **Step 2: Write SKILL.md**

Full contents of `plugins/worktree-plus/skills/worktree-config/SKILL.md`:

````markdown
---
name: worktree-config
description: Configure worktree-plus via git config — set baseBranch, branchPrefix, dirBase, or reset. Use when the user asks to configure worktree-plus, view or change worktree settings, or reset the plugin config.
allowed-tools: Bash(git config *), Bash(git worktree list *), Bash(git rev-parse *), Bash(ls *), Read
---

# worktree-plus Configuration

Manage worktree-plus settings. All settings live in git config under the `worktreeplus.*` namespace (plugin-custom) plus one `worktree.guessRemote` (git-native). No env vars.

## Settings

| Key | Default | Scope guidance |
|---|---|---|
| `worktreeplus.baseBranch` | `HEAD` | Per-repo typical (different repos have different default branches) |
| `worktreeplus.branchPrefix` | `worktree-` | Global typical (personal naming convention); per-repo for team rules |
| `worktreeplus.dirBase` | `.claude/worktrees` | Per-repo typical |
| `worktree.guessRemote` | `true` (plugin override; git default is `false`) | Global typical |

## View current settings

Always start by showing what's active. Run:

```bash
git config --get-regexp '^worktreeplus\.|^worktree\.guessRemote'
```

If nothing prints, the user is on defaults. State that explicitly — don't leave them guessing.

For layered view (local vs global vs system):

```bash
git config --local  --get-regexp worktreeplus
git config --global --get-regexp worktreeplus
```

## Change a setting

Ask scope before writing. "Just this repo" (`--local`, default) vs "all repos for me" (`--global`).

```bash
git config [--local|--global] worktreeplus.baseBranch develop
git config [--local|--global] worktreeplus.branchPrefix "feat-"
git config [--local|--global] worktreeplus.dirBase ".worktrees"
git config [--local|--global] worktree.guessRemote false
```

Writes take effect on the next `EnterWorktree` / `claude -w`. Existing worktrees are not affected.

## Reset / unset

Destructive. Confirm with the user first before running — name exactly what will be removed.

Single key:
```bash
git config [--local|--global] --unset worktreeplus.baseBranch
```

All plugin settings at once:
```bash
git config [--local|--global] --remove-section worktreeplus
```

## Value validation

Before writing, sanity-check the value:

- **`branchPrefix`**: literal — `"feat-"` produces `feat-name`, `"feat"` produces `featname`. If user says "use feat prefix" they almost certainly want the `-`. Ask.
- **`dirBase`**: no tilde expansion (`~/foo` stays literal). Relative paths resolve against the repo root. Trailing slash is stripped automatically. Empty value falls back to default.
- **`baseBranch`**: must be a resolvable ref. `git rev-parse --verify <value>` works? If not, warn.

## Migration check

If the user mentions `WORKTREE_BASE_BRANCH` / `WORKTREE_BRANCH_PREFIX` env vars:

1. These were removed in v3.0.0. SessionStart migrated them to `--global` git config on first run.
2. Check migration ran and inspect its record:
   ```bash
   ls  "${CLAUDE_PLUGIN_DATA}/migrated-envvars"
   cat "${CLAUDE_PLUGIN_DATA}/migrated-envvars"   # shows migration version + timestamp
   ```
3. Verify current global config captured the old values:
   ```bash
   git config --global --get-regexp worktreeplus
   ```
4. Tell the user to remove the env vars from their shell profile — they're now dead weight.

If the flag file is missing but env vars are still set (shouldn't happen in normal flow), run the migration manually by re-triggering SessionStart (restart Claude Code).

## Gotchas

- **Changing `dirBase` does not move existing worktrees.** New worktrees go to the new location; old ones stay at the old path. Both still appear in `git worktree list` and can be removed normally, but the mixed layout is confusing. Tell the user to finish/remove pending worktrees before changing `dirBase`.
- **`git config --remove-section` errors if the section doesn't exist.** Check first: `git config --get-regexp '^worktreeplus\.'` — if empty, skip remove.
- **`--global` writes go to `~/.gitconfig`.** If the user wants truly project-scoped, use `--local` (writes to `.git/config`). Local overrides global.
- **`worktree.guessRemote=true` is the plugin's non-default.** Setting it explicitly to `false` disables auto-tracking of remote branches — user gets pure HEAD branch creation. Git's own default is `false`; the plugin flips it for better UX but respects explicit user config.
- **`branchPrefix` is literal (no auto-separator).** Different from the pre-v3 env var which inserted `-` automatically. The migration adds the `-` for you when converting, but fresh writes don't.
- **Narrow `allowed-tools` scope.** Only `git config`, `git worktree list`, `git rev-parse`, `ls`, and `Read` are pre-approved here. If you reach for another command (e.g., `git worktree remove`, file edits), the user will see a permission prompt — that's intentional. This skill is read/write on *config only*; actual worktree lifecycle belongs to the `worktree-plus` hooks.
````

- [ ] **Step 3: Validate frontmatter**

```bash
unset CLAUDECODE && claude plugin validate plugins/worktree-plus/
```

Expected: no errors. If `allowed-tools` syntax fails, strip to `Bash, Read` as a looser fallback.

- [ ] **Step 4: Smoke test triggering**

In a fresh Claude Code session (after restart to pick up new skill):
```
user: "worktree-plus 설정 확인해줘"
expected: skill triggers, Claude runs `git config --get-regexp ...`

user: "base branch를 develop로 바꿔"
expected: skill triggers, Claude asks --local vs --global, then runs git config
```

- [ ] **Step 5: Commit**

```bash
git add plugins/worktree-plus/skills/worktree-config/SKILL.md
git commit -m "feat(worktree-plus): add worktree-config skill for managing settings"
```

---

## Task 6: Rewrite README.md

**Files:**
- Modify: `plugins/worktree-plus/README.md`

- [ ] **Step 1: Update the Features table (lines 17-24)**

Replace:
```markdown
| Branch base | Remote default branch | HEAD (configurable via env/git config) |
| Remote tracking | None | `--guess-remote` support |
| Branch prefix | `worktree-` (fixed) | Configurable via `WORKTREE_BRANCH_PREFIX` |
```

With:
```markdown
| Branch base | Remote default branch | HEAD (configurable via `worktreeplus.baseBranch`) |
| Worktree path | `.claude/worktrees/<name>` (fixed) | Configurable via `worktreeplus.dirBase` |
| Remote tracking | None | `--guess-remote` support (respects `worktree.guessRemote`) |
| Branch prefix | `worktree-` (fixed) | Configurable via `worktreeplus.branchPrefix` |
| Gitignored files | Not copied | `.worktreeinclude` copy / `.worktreelink` symlink |
| Cleanup protection | None | Blocks removal if uncommitted changes or unpushed commits |
```

- [ ] **Step 2: Replace the Gitignored files examples (lines 49-60)**

Replace:
```markdown
**`.worktreelink`** — files to symlink (shared, zero disk overhead):
```
references/
node_modules/
```
```

With:
```markdown
**`.worktreelink`** — files to symlink (shared, zero disk overhead):
```
node_modules/
.venv/
```

Good `.worktreelink` candidates are large gitignored directories that don't need per-worktree isolation (dependency caches, build artifacts). Git-tracked directories are already checked out into each worktree automatically — don't link them.
```

- [ ] **Step 3: Rewrite the Configuration section (lines 62-68)**

Replace the entire `### Configuration` section with:
```markdown
### Configuration

All settings live in git config. Use `--local` for this repo only (default) or `--global` for all your repos.

**Plugin extensions** (worktree-plus adds these):

| Key | Default | Example |
|---|---|---|
| `worktreeplus.baseBranch` | `HEAD` | `git config worktreeplus.baseBranch develop` |
| `worktreeplus.branchPrefix` | `worktree-` | `git config worktreeplus.branchPrefix "feat-"` (literal — include your own separator) |
| `worktreeplus.dirBase` | `.claude/worktrees` | `git config worktreeplus.dirBase ".worktrees"` (relative to repo root, or absolute) |

**Git native** (standard [git-worktree config](https://git-scm.com/docs/git-worktree#_configuration)):

| Key | worktree-plus default | Git default |
|---|---|---|
| `worktree.guessRemote` | `true` (auto-track matching remote branches) | `false` |

View active settings:
```
git config --get-regexp '^worktreeplus\.|^worktree\.guessRemote'
```

**Notes:**
- `branchPrefix` is literal — `feat-` produces `feat-name`, `feat` produces `featname`.
- `dirBase` does not expand `~`; use an absolute path if you want `$HOME`.
- Changing `dirBase` does not move existing worktrees. Finish or remove pending worktrees first.

### Migrating from v2.x env vars

v2.x used `WORKTREE_BASE_BRANCH` and `WORKTREE_BRANCH_PREFIX` environment variables. v3 reads only git config.

On first session start after upgrade, SessionStart auto-migrates any set env var to `--global` git config (one-time, flagged in `${CLAUDE_PLUGIN_DATA}/migrated-envvars`). Remove the `export` lines from your shell profile afterward — env vars are no longer read.

Prefer to migrate manually? Do it before upgrading:
```
git config --global worktreeplus.baseBranch "$WORKTREE_BASE_BRANCH"
git config --global worktreeplus.branchPrefix "${WORKTREE_BRANCH_PREFIX}-"   # note the trailing '-'
```
Then unset the env vars and delete `${CLAUDE_PLUGIN_DATA}/migrated-envvars` (so the migration still fires as a no-op and records the flag).
```

- [ ] **Step 4: Verify final README**

```bash
grep -n 'WORKTREE_' plugins/worktree-plus/README.md
```
Expected: matches only inside the "Migrating from v2.x" section.

```bash
grep -n 'references/' plugins/worktree-plus/README.md
```
Expected: no matches (replaced with node_modules/.venv).

- [ ] **Step 5: Commit**

```bash
git add plugins/worktree-plus/README.md
git commit -m "docs(worktree-plus): rewrite Configuration, add migration guide, update examples"
```

---

## Task 7: Update descriptions and bump version

**Files:**
- Modify: `plugins/worktree-plus/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Update `plugin.json` description**

Old:
```json
"description": "Enhanced git worktree: custom branch prefix, remote tracking, selective copy/symlink for gitignored files"
```

New:
```json
"description": "Enhanced git worktree: git-config-driven settings, remote tracking, copy/symlink for gitignored files, safe removal"
```

- [ ] **Step 2: Update marketplace entry**

In `.claude-plugin/marketplace.json`, find the `"name": "worktree-plus"` entry and update:

```json
{
  "name": "worktree-plus",
  "source": "./plugins/worktree-plus",
  "version": "3.0.0",
  "description": "Enhanced git worktree: git-config-driven settings, remote tracking, copy/symlink for gitignored files, safe removal"
}
```

Key changes:
- `"version": "2.8.2"` → `"version": "3.0.0"` (major bump — env var interface removed)
- Description updated to mention git config and drop stale phrasing

- [ ] **Step 3: Validate manifest**

```bash
unset CLAUDECODE && claude plugin validate .
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add plugins/worktree-plus/.claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "release(worktree-plus): bump to 3.0.0 — env vars removed, dirBase added"
```

---

## Task 8: Final validation

**Files:** none (verification only)

- [ ] **Step 1: Plugin validation**

```bash
unset CLAUDECODE && claude plugin validate .
```
Expected: no errors across the whole marketplace.

- [ ] **Step 2: End-to-end manual test**

Fresh throwaway repo, worktree-plus installed from the local marketplace with the new version:

1. Default behavior (no config):
   - Create worktree `foo` → `.claude/worktrees/foo`, branch `worktree-foo`
   - Remove `foo` → clean removal, log written

2. Custom `dirBase`:
   - `git config worktreeplus.dirBase ".worktrees"`
   - Create `bar` → `.worktrees/bar`, branch `worktree-bar`
   - Remove `bar` → clean removal (verifies Task 3 fix)

3. Custom `branchPrefix`:
   - `git config worktreeplus.branchPrefix "feat-"`
   - Create `baz` → `.worktrees/feat-baz`

4. Empty prefix:
   - `git config worktreeplus.branchPrefix ""`
   - Create `qux` → `.worktrees/qux`, branch `qux` (no prefix)

5. Migration path:
   - Delete `${CLAUDE_PLUGIN_DATA}/migrated-envvars`
   - Unset global `worktreeplus.*`
   - Start session with `WORKTREE_BRANCH_PREFIX=wt` exported
   - Expected: SessionStart message reports migration to `"wt-"`, flag file created with `v3.0.0 <timestamp>` content, env var value translated correctly
   - Negative case: temporarily chmod `~/.gitconfig` read-only, rerun with fresh flag deleted — expected: stderr WARNING line surfaces the failure, flag IS still created (fail-soft: no infinite retry). To retry, user manually fixes permissions, deletes flag, restarts session.

6. Config skill triggering:
   - Ask "worktree-plus 설정 확인해줘" — skill should trigger, list config
   - Ask "base branch를 main으로 바꿔" — skill asks scope, then writes config

- [ ] **Step 3: Review the git log for the branch**

```bash
git log --oneline develop ^main
```
Expected: seven focused commits (Tasks 2-7), each <= 5 lines diff summary.

- [ ] **Step 4: Self-review of changes**

```bash
git diff main...develop -- plugins/worktree-plus/
```

Walk through the diff and confirm:
- No stray env-var references outside the migration code and README migration section
- No `.claude/worktrees` hardcoding outside the default fallback
- All three scripts pass `shellcheck` if available:
  ```bash
  shellcheck plugins/worktree-plus/hooks/scripts/*.sh
  ```
- `SKILL.md` has frontmatter, no README.md inside the skill folder, gotchas present

---

## Self-Review (author: complete before handing off)

**Spec coverage check:**
- [x] Task 2 covers: env var removal (create), `dirBase` addition, empty/trailing-slash edge cases, `~/` rejection, literal prefix decision
- [x] Task 3 covers: C1 (broken main-repo detection replaced with `--git-common-dir`)
- [x] Task 4 covers: C2 (one-shot migration flag, version-independent filename), legacy `-` join translation, stderr warning on `git config` failure
- [x] Task 5 covers: skill renamed `config` → `worktree-config` (avoids generic-name triggering collisions), allowed-tools whitelist covers every command the body invokes (`git config`, `git worktree list`, `git rev-parse`, `ls`, `Read`), description tightened, gotcha for narrow tool scope added
- [x] Task 6 covers: README Features table, Configuration rewrite, symlink example swap, migration guide, dirBase caveats (M1)
- [x] Task 7 covers: C3 (major bump to 3.0.0), plugin.json + marketplace.json descriptions shortened to one-liner
- [x] Task 8 covers: end-to-end verification including create/remove/migrate smoke tests and a negative migration test (read-only gitconfig)

**Placeholder scan:** no TBD / TODO / "implement later" / "similar to Task N" present. Every code block is complete.

**Type / signature consistency:**
- `worktreeplus.branchPrefix` is literal in both Task 2 and the migration code in Task 4 (migration adds `-` explicitly to preserve v2 semantics)
- `DIR_BASE` stripped of trailing slash consistently; `~/*` patterns explicitly rejected
- `PROJECT_ROOT` derivation in Task 3 uses `cd`-based resolution (no reliance on `--path-format=absolute`, keeping git 2.5+ compat)
- Flag file name `migrated-envvars` (version-independent) referenced identically in Task 4 script, Task 5 skill docs, Task 6 README, Task 8 tests; file content carries `v<version> <timestamp>` for forensics
- Skill name `worktree-config` referenced identically in File Structure, Task 5 mkdir/path/commit, and all skill-body internal references

**Gaps identified, now addressed:**
- Initial draft didn't handle `dirBase=""` (empty string written to config) → Task 2 Step 2 now normalizes empty to default
- Initial draft let `~/`-prefixed `dirBase` fall through, silently creating a literal `~` directory → Task 2 case statement now rejects with a clear error
- Initial draft risked migrating transient env vars permanently → Task 4 flag file fixes this
- Initial draft was fail-silent on `git config --global` migration errors → Task 4 now emits stderr WARNING on each failed migration, per variable
- Initial draft tied the flag filename to a specific version (`migrated-envvars-v3`), forcing a new filename every major bump → Task 4 uses version-independent name with version recorded in file content
- Initial draft named the skill `config`, colliding with the many other plugins that have config skills → Task 5 renames to `worktree-config` for unambiguous triggering
- Initial draft's `config` skill allowed-tools missed `git rev-parse` and `ls` that the body actually invokes → Task 5 whitelist now matches the commands
- Initial draft didn't document the breaking change in prefix join semantics → Task 6 Configuration section calls out "literal" explicitly
- Initial draft's plugin/marketplace descriptions were compound run-on sentences → Task 7 tightened to a single clause

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-14-worktree-plus-config-refactor.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
