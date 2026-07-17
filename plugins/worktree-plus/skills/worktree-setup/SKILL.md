---
name: worktree-setup
disable-model-invocation: true
description: Set up worktree-plus for a repo — manage git config (baseBranch, branchPrefix, dirBase, guessRemote) and build the .worktreeinclude / .worktreelink files by scanning which gitignored files actually exist. Use when the user asks to set up or configure worktree-plus, view or change worktree settings, reset the plugin config, or decide which gitignored files should be copied or symlinked into new worktrees.
allowed-tools: Bash(git config *), Bash(git worktree list *), Bash(git rev-parse *), Bash(git ls-files *), Bash(du *), Bash(ls *), Read
---

# worktree-plus Setup

Two jobs live here, and a user usually wants one of them:

- **Settings** — git config under the `worktreeplus.*` namespace (plugin-custom) plus one `worktree.guessRemote` (git-native). No env vars. Start at [Settings](#settings).
- **Which gitignored files follow a worktree** — the `.worktreeinclude` (copy) and `.worktreelink` (symlink) files at the repo root. Start at [Set up .worktreeinclude / .worktreelink](#set-up-worktreeinclude--worktreelink).

If the user's ask is vague ("set up worktree-plus"), show the current settings first — it's cheap and orients both of you — then offer the include/link scan.

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

## Set up .worktreeinclude / .worktreelink

Two files at the repo root decide which gitignored paths follow a new worktree:

- **`.worktreeinclude`** — copied into each worktree. Independent per worktree; later edits don't leak back to the source.
- **`.worktreelink`** — symlinked to the original. One copy shared by every worktree: no disk cost, but every worktree sees the same bytes.

The `WorktreeCreate` hook reads both and records each outcome in `<worktree>/.worktree.log`.

### Workflow: scan → propose → confirm → write

The confirm step isn't a formality. These files land at the user's repo root and usually get committed, so writing one they didn't agree to is an unrequested change to their project. Show the candidate list and get a yes before writing or editing either file. `Write`/`Edit` sit outside this skill's `allowed-tools` on purpose, so a permission prompt fires too — that's a backstop, not the approval.

### 1. Scan

Ground truth is what git actually ignores, not what `.gitignore` says:

```bash
git ls-files --others --ignored --exclude-standard --directory --full-name
```

Run it on its own, not chained behind another command — the pre-approval in `allowed-tools` is a prefix match, so `git rev-parse --show-toplevel && git ls-files …` doesn't match `Bash(git ls-files *)` and costs the user a permission prompt for a read they already approved.

This folds in every ignore layer (`.gitignore`, `.git/info/exclude`, global `core.excludesFile`) and prints only paths that **exist on disk** — the same criterion the hook uses, since anything absent is logged `skipped (not found)`. `--directory` collapses a fully-ignored directory to a single line. `--full-name` keeps paths relative to the repo root; without it, running from a subdirectory yields cwd-relative paths, and the hook resolves them against the repo root instead — silently wrong entries.

Size the plausible candidates, since large is the main argument for link over copy:

```bash
du -sh node_modules .venv assets/media
```

Read `.gitignore` as well, but for its **comments** — a line like `# model weights, downloaded once` states intent that the path alone doesn't.

Prune the scan output before proposing anything:

- **Never propose the worktree directory itself** (`worktreeplus.dirBase`, default `.claude/worktrees/`). It's gitignored, so it appears in the scan, and copying it would clone every existing worktree into the new one.
- Drop OS/editor junk (`.DS_Store`, `.idea/`) and regenerable caches (`__pycache__/`, `.pytest_cache/`) unless the user wants them.
- Collapse child paths whose parent is already listed.

### 2. Propose

Show each candidate with the evidence behind the call — size, whether the content varies by branch, what sharing would mean. The user can only overturn a classification they can see the reasoning for:

```
.env                 4 KB    copy  — per-worktree secrets; branches may need different values
references/          1.2 GB  link  — vendored read-only repos, branch-invariant; copying costs 1.2 GB per worktree
node_modules/        680 MB  copy  — dependency state tracks the branch's manifest
```

copy vs link is a judgment call, not a lookup table. The question underneath: **would two worktrees ever need this path to differ?** If yes, copy it (or leave it out and let the user regenerate it). If no, and it's big, link it.

When the user wants to link a per-branch dependency directory (`node_modules/`, `.venv/`, `target/`), don't refuse — explain and let them choose. A symlink makes every worktree share one directory, so an install on a branch that bumped a dependency silently rewrites what the other worktrees run against; the breakage surfaces later, elsewhere, as a version mismatch nobody made. Some users take that trade for the disk savings on branches that never touch the manifest. The point is that they take it knowingly.

### 3. Write

One literal path per line. The file resembles `.gitignore` but is not a pattern file — the hook tests each line with `[ -d ]` / `[ -f ]` against `<repo-root>/<line>`, so:

- **No globs.** `.env*` is looked up as a file literally named `.env*` and logged `skipped (not found)`. List `.env` and `.env.local` as separate lines.
- **No negation.** `!foo` reads as a path named `!foo`.
- **Comments need their own line.** `#` only opens a comment at the start of a line — `.env # secrets` is read as a path named `.env # secrets`.
- Paths are relative to the repo root; trailing slashes are optional (stripped).

```
# secrets — per-worktree
.env
config/secrets.yaml
```

Then point the user at verification: the next worktree's `.worktree.log` lists every entry as `copied:`, `linked:`, or `skipped (not found):`.

### Merging into a file that already exists

Read the existing file first and **append only what's missing**. Never regenerate it. Those lines carry intent your scan can't reconstruct — the grouping, the ordering, the comment explaining why a path earns its place, and entries deliberately listed before they exist on disk. A wholesale rewrite destroys all of that silently, and the user finds out later.

- Match on the normalized path: strip trailing slashes and skip comment lines before comparing, so an existing `node_modules` doesn't collect a second `node_modules/` line.
- Append at the end under a comment of their own. Leave every existing byte alone.
- **Check the file ends with a newline before appending.** These are hand-edited files and often don't. Appending `.env` to a file whose last line is `references/` with no trailing newline yields `references/.env` — a single path matching nothing, logged `skipped (not found)`.
- If the path already sits in the *other* file, say so rather than adding it. A path in both is copied first, and then the symlink step does nothing at all: it skips when the destination already exists, without a log line or an error. The user gets a copy while believing they configured a link.

### Reporting dead entries

While merging, test each existing entry against disk and report the ones that don't resolve:

```
.worktreeinclude:
  config/old-secrets.yaml   not found on disk
```

Report, then stop — don't delete. A path missing from disk isn't necessarily stale: it may exist on the user's other machine, be generated later by a build step, or just not be created yet. The hook already tolerates it (`skipped (not found)`, then it moves on), so a dead entry costs one log line, not a failure. Quietly deleting a line the user wrote to tidy that up is the worse trade. Name the likely reasons and let them decide.

## Gotchas

- **Changing `dirBase` does not move existing worktrees.** New worktrees go to the new location; old ones stay at the old path. Both still appear in `git worktree list` and can be removed normally, but the mixed layout is confusing. Tell the user to finish/remove pending worktrees before changing `dirBase`.
- **`git config --remove-section` errors if the section doesn't exist.** Check first: `git config --get-regexp '^worktreeplus\.'` — if empty, skip remove.
- **`--global` writes go to `~/.gitconfig`.** If the user wants truly project-scoped, use `--local` (writes to `.git/config`). Local overrides global.
- **`worktree.guessRemote=true` is the plugin's non-default.** Setting it explicitly to `false` disables auto-tracking of remote branches — user gets pure HEAD branch creation. Git's own default is `false`; the plugin flips it for better UX but respects explicit user config.
- **`branchPrefix` is literal (no auto-separator).** Different from the pre-v3 env var which inserted `-` automatically. The migration adds the `-` for you when converting, but fresh writes don't.
- **Narrow `allowed-tools` scope.** Pre-approved here: `git config` (read/write), plus the read-only `git worktree list`, `git rev-parse`, `git ls-files`, `du`, `ls`, and `Read`. Anything else — `Write`, `Edit`, `git worktree remove` — raises a permission prompt, and that's the design. This skill writes git config directly, but `.worktreeinclude` / `.worktreelink` are user files at the repo root: the skill scans and proposes, the user approves, and the prompt confirms. Worktree lifecycle itself belongs to the `worktree-plus` hooks, not here.
