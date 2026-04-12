# worktree-plus

> Native git worktree behavior for Claude Code — with gitignored file support.

## Why

Claude Code's built-in worktree differs from native `git worktree` in ways that matter: it branches from the remote default instead of HEAD, doesn't track remote branches, uses a fixed prefix, and ignores gitignored files like `.env` or `node_modules/`.

worktree-plus replaces Claude Code's `WorktreeCreate` and `WorktreeRemove` hooks to restore native git behavior. This applies everywhere Claude Code creates worktrees — `claude -w` at startup, `EnterWorktree` mid-session, and subagent `isolation: "worktree"`. It also adds `.worktreeinclude` / `.worktreelink` for selectively bringing gitignored files into worktrees, and protects uncommitted work on cleanup.

## How it works

Claude Code fires `WorktreeCreate` and `WorktreeRemove` hook events whenever a worktree is created or removed. This plugin registers handlers for both events via `hooks.json` — no manual settings.json editing needed. Once installed, every worktree operation goes through worktree-plus automatically.

## Features

| Feature | Built-in | worktree-plus |
|---------|----------|---------------|
| Branch base | Remote default branch | HEAD (configurable via env/git config) |
| Remote tracking | None | `--guess-remote` support |
| Branch prefix | `worktree-` (fixed) | Configurable via `WORKTREE_BRANCH_PREFIX` |
| Gitignored files | Not copied | `.worktreeinclude` copy / `.worktreelink` symlink |
| Cleanup protection | None | Blocks removal if uncommitted changes or unpushed commits |

## Prerequisites

- **jq** (`brew install jq`)

## Install

```shell
/plugin install worktree-plus@claude-code-zero
```

Restart Claude Code after install. No setup step needed — hooks register automatically.

> **Upgrading from v2.7.0 or earlier?** Previous versions wrote hooks into your `settings.json`. The plugin now cleans those up automatically on first session start after update.

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
references/
node_modules/
```

### Configuration

| Setting | Method | Default | Example |
|---------|--------|---------|---------|
| Branch base | `WORKTREE_BASE_BRANCH` env var or `worktreeplus.baseBranch` git config | HEAD | `develop` |
| Branch prefix | `WORKTREE_BRANCH_PREFIX` env var | `worktree-` | `feat` (→ `feat-name`), `""` (no prefix) |
| Remote tracking | `worktree.guessRemote` git config | `true` | `false` to disable |

## License

MIT
