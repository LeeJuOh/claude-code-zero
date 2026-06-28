# worktree-plus

> Drop-in replacement for Claude Code's built-in worktree — with gitignored file support.

## Why

You create a worktree, `cd` in, run `npm start` — it fails because `.env` and your local config didn't come with you. You recreate them, finish the work, delete the worktree — and your uncommitted tweaks are gone with it.

That's Claude Code's built-in worktree. The full list of what bites:

- **Skips gitignored files** — `.env`, local config, and local-only docs don't follow you in, so the project won't run until you recreate them.
- **No cleanup guard** — `remove` wipes uncommitted changes, untracked files, and unpushed commits without warning.
- **Branches from the remote default**, not `HEAD` — you can't fork a feature branch off the work you're sitting on.
- **No remote tracking** — new branches don't track matching `origin/*`, so `git pull` / `push` need `-u` every time.
- **Fixed prefix and path** — always `worktree-<name>` under `.claude/worktrees/`, no per-repo customization.
- **Fails on re-entry** — trying to reuse an existing directory or branch errors out instead of reopening.

worktree-plus fixes all of these, and applies everywhere Claude Code creates worktrees: `claude -w` at startup, `EnterWorktree` mid-session, and subagents with `isolation: "worktree"`.

## Features

| Feature | Built-in | worktree-plus |
|---------|----------|---------------|
| Branch base | Remote default branch | HEAD (configurable via `worktreeplus.baseBranch`) |
| Worktree path | `.claude/worktrees/<name>` (fixed) | Configurable via `worktreeplus.dirBase` |
| Remote tracking | None | `--guess-remote` support (respects `worktree.guessRemote`) |
| Branch prefix | `worktree-` (fixed) | Configurable via `worktreeplus.branchPrefix` |
| Gitignored files | Not copied | `.worktreeinclude` copy / `.worktreelink` symlink |
| Re-entry behavior | Fails if directory/branch exists | Reuses existing worktree (idempotent) |
| Audit trail | None | Per-worktree `.worktree.log` with create/remove events, base branch, include/link outcomes, and BLOCKED reasons |
| Cleanup protection | None | Blocks removal if uncommitted changes, untracked files, or unpushed commits; only deletes branches with upstream |
| Conversational config | N/A | Bundled `/worktree-config` skill to view, set, or reset settings |

## Prerequisites

- **jq** (`brew install jq`)

## Install

```shell
/plugin install worktree-plus@claude-code-zero
```

Start a new Claude Code session after install. On first session start, hooks are auto-configured in your `settings.json` (local or global — chosen based on where the plugin is enabled) and the SessionStart message summarizes what was injected. No manual setup needed.

## Usage

All worktree entry points are enhanced:

```bash
claude -w                            # startup with worktree
claude -w my-feature                 # named worktree
```

Mid-session, ask Claude to "create a worktree" — it uses `EnterWorktree` which triggers the same hooks. Subagents with `isolation: "worktree"` also benefit.

### Removal safety

When a worktree is removed through the hook, worktree-plus blocks removal if the worktree has staged or unstaged changes, untracked files, or commits not pushed to upstream. Branches without an upstream are preserved on removal — only the worktree directory is cleaned up. If `git worktree remove` fails, the directory is left untouched.

### Gitignored files

**`.worktreeinclude`** — files to copy (independent per worktree):
```
.env
config/secrets.yaml
notes/local-todo.md
```

**`.worktreelink`** — directories to symlink (shared across worktrees, zero disk overhead):
```
models/
assets/media/
references/
```

Good `.worktreelink` candidates are large, **branch-invariant** gitignored directories that are safe to share: downloaded assets and datasets, content-addressed caches, read-only vendored repos.

**Don't link `node_modules/`, `.venv/`, or any per-branch dependency state.** A symlink makes every worktree share one copy, so an install in one worktree silently mutates the others when two branches need different dependencies. Those belong in `.worktreeinclude` (copy) — or just reinstall them per worktree, since the git-tracked manifest (`package.json`, `requirements.txt`) is already checked out. Git-tracked directories are checked out into each worktree automatically — don't link them either.

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

## How it works

Claude Code fires `WorktreeCreate` and `WorktreeRemove` hook events whenever a worktree is created or removed. However, `claude -w` creates the worktree before plugins load, so plugin `hooks.json` cannot intercept it in time. To work around this, the plugin auto-injects its hooks into your `settings.json` on first session start — settings.json hooks load early enough to catch all worktree operations, including `claude -w`.

## License

MIT
