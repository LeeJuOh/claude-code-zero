---
name: worktree-config
disable-model-invocation: true
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
