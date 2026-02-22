---
name: worktree
description: |
  Create a git worktree for an existing or new branch with .worktreeinclude file copying.
  Use when creating worktrees, checking out existing branches into worktrees, or setting up isolated work environments.
argument-hint: <branch> [path]
allowed-tools: Bash(git *), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/*), Read
---

Create a manual git worktree for an existing or new branch, with automatic `.worktreeinclude` file copying.

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

1. **Determine worktree path**
   - If `$1` is provided, use it as the worktree path
   - Otherwise, default to `.claude/worktrees/$0`

2. **Check for existing worktree**
   - Run `git worktree list` and check if the resolved path already exists as a worktree
   - If it does, inform the user and stop

3. **Determine branch status**
   - Check local: `git show-ref --verify refs/heads/$0`
   - Check remote: `git ls-remote --heads origin $0`
   - Determine one of three states: local exists, remote-only, or new branch

4. **Create worktree**
   - **Local branch exists**: `git worktree add <path> $0`
   - **Remote-only**: `git worktree add <path> $0` (git auto-tracks remote)
   - **New branch**: `git worktree add -b $0 <path>` (creates from current HEAD)

5. **Copy .worktreeinclude files**
   - Determine the project root: `git rev-parse --show-toplevel`
   - Run: `${CLAUDE_PLUGIN_ROOT}/scripts/copy-worktreeinclude.sh <project-root> <worktree-path>`
   - Report the copy results to the user

6. **Report success**
   - Show the worktree path and branch name
   - Suggest next steps:
     ```
     cd <worktree-path>
     claude                          # start a new session in the worktree
     git worktree remove <path>      # cleanup when done
     ```
