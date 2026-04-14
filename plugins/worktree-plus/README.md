# worktree-plus

> Native git worktree behavior for Claude Code — with gitignored file support.

## Why

Claude Code's built-in worktree differs from native `git worktree` in ways that matter: it branches from the remote default instead of HEAD, doesn't track remote branches, uses a fixed prefix, and ignores gitignored files like `.env` or `node_modules/`.

worktree-plus replaces Claude Code's `WorktreeCreate` and `WorktreeRemove` hooks to restore native git behavior. This applies everywhere Claude Code creates worktrees — `claude -w` at startup, `EnterWorktree` mid-session, and subagent `isolation: "worktree"`. It also adds `.worktreeinclude` / `.worktreelink` for selectively bringing gitignored files into worktrees, and protects uncommitted work on cleanup.

## How it works

Claude Code fires `WorktreeCreate` and `WorktreeRemove` hook events whenever a worktree is created or removed. However, `claude -w` creates the worktree before plugins load, so plugin `hooks.json` cannot intercept it in time. To work around this, the plugin auto-injects its hooks into your `settings.json` on first session start — settings.json hooks load early enough to catch all worktree operations, including `claude -w`.

## Features

| Feature | Built-in | worktree-plus |
|---------|----------|---------------|
| Branch base | Remote default branch | HEAD (configurable via `worktreeplus.baseBranch`) |
| Worktree path | `.claude/worktrees/<name>` (fixed) | Configurable via `worktreeplus.dirBase` |
| Remote tracking | None | `--guess-remote` support (respects `worktree.guessRemote`) |
| Branch prefix | `worktree-` (fixed) | Configurable via `worktreeplus.branchPrefix` |
| Gitignored files | Not copied | `.worktreeinclude` copy / `.worktreelink` symlink |
| Cleanup protection | None | Blocks removal if uncommitted changes or unpushed commits |

## Prerequisites

- **jq** (`brew install jq`)

## Install

```shell
/plugin install worktree-plus@claude-code-zero
```

Restart Claude Code after install. On first session start, hooks are auto-configured in your `settings.json` — no manual setup needed.

## Usage

All worktree entry points are enhanced:

```bash
claude -w                            # startup with worktree
claude -w my-feature                 # named worktree
```

Mid-session, ask Claude to "create a worktree" — it uses `EnterWorktree` which triggers the same hooks. Subagents with `isolation: "worktree"` also benefit.

### Gitignored files

**`.worktreeinclude`** — files to copy (independent per worktree):
```
.env
config/secrets.yaml
```

**`.worktreelink`** — files to symlink (shared, zero disk overhead):
```
node_modules/
.venv/
```

Good `.worktreelink` candidates are large gitignored directories that don't need per-worktree isolation (dependency caches, build artifacts). Git-tracked directories are already checked out into each worktree automatically — don't link them.

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

## License

MIT
