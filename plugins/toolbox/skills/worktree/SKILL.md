---
name: worktree
description: |
  Create a git worktree for an existing or new branch with .worktreeinclude (copy) and .worktreelink (symlink) support.
  Use when creating worktrees, checking out existing branches into worktrees, or setting up isolated work environments.
argument-hint: <branch> [path]
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/*)
---

Create a manual git worktree for an existing or new branch, with automatic `.worktreeinclude` file copying and `.worktreelink` symlinking.

## Arguments

- `$0`: branch name (required) — an existing local branch, remote branch, or new branch name
- `$1`: worktree directory path (optional, defaults to `.claude/worktrees/<branch>`)

If `$0` is empty, display the usage below and stop:

```
Usage: /worktree <branch> [path]

Examples:
  /worktree feature/auth              # existing or new branch → .claude/worktrees/feature/auth
  /worktree fix/login-bug work/login  # specific path
  /worktree develop                   # checkout existing branch
```

## Steps

1. **Validate input** — If `$0` is empty, show the usage above and stop.

2. **Run the create script** — Execute:
   ```
   ${CLAUDE_PLUGIN_ROOT}/scripts/create-worktree.sh "$0" "$1"
   ```
   The script handles everything: branch detection, worktree creation, `.worktreeinclude` copying, and `.worktreelink` symlinking.

3. **Report result** — Show the script output and suggest next steps:
   ```
   cd <worktree-path>
   claude                          # start a new session in the worktree
   git worktree remove <path>      # cleanup when done
   ```
