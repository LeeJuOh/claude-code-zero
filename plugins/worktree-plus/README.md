# worktree-plus

> Native git worktree behavior for Claude Code — with gitignored file support.

## Why

Claude Code's built-in worktree (`claude -w`) differs from native `git worktree` in ways that matter: it branches from the remote default instead of HEAD, doesn't track remote branches, uses a fixed prefix, and ignores gitignored files like `.env` or `node_modules/`.

worktree-plus replaces the worktree hooks to restore native git behavior, adds `.worktreeinclude` (copy) and `.worktreelink` (symlink) for selectively bringing gitignored files into worktrees, and protects uncommitted work on cleanup.

## Features

| Feature | Built-in `claude -w` | worktree-plus |
|---------|----------------------|---------------|
| Branch base | Remote default branch | HEAD (configurable) |
| Remote tracking | None | `--guess-remote` support |
| Branch prefix | `worktree-` (fixed) | Configurable via env var |
| Gitignored files | Not copied | `.worktreeinclude` copy / `.worktreelink` symlink |
| Cleanup protection | None | Blocks removal if uncommitted changes or unpushed commits |

## Prerequisites

- **jq** (`brew install jq`)

## Install

```shell
/plugin install worktree-plus@claude-code-zero
```

After install, run `/worktree-plus:setup` to register hooks, then restart Claude Code.

## Usage

```bash
claude -w                            # create worktree with gitignored files
claude -w my-feature                 # named worktree
WORKTREE_BASE_BRANCH=develop claude -w feature  # branch from develop
```

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

## License

MIT
