# worktree-plus

Enhanced git worktree for Claude Code with custom branch prefix, remote branch tracking, and selective copy for gitignored files.

## Problem

Claude Code's built-in worktree (`claude -w`) has three limitations:

1. **Gitignored files are missing** - `.env`, config files, etc. are not copied to the worktree
2. **Fixed branch prefix** - Branch names always start with `worktree`
3. **No remote branch tracking** - Always creates a new branch from HEAD, ignoring existing remote branches

## Solution

This plugin replaces the default `WorktreeCreate` hook to add:

- **`.worktreeinclude`** file for specifying which gitignored files/directories to copy
- **`WORKTREE_BRANCH_PREFIX`** env var for custom branch naming
- **Remote branch tracking** — controlled by `git config worktree.guessRemote` (default: `true`)

## Installation

```bash
claude plugin add ./plugins/worktree-plus
```

## Setup

### 1. Create `.worktreeinclude` in your project root

```gitignore
# Copy these files to worktrees
.env
.env.local
config/secrets.yaml

# Copy directories
docs/
references/
```

**Rules:**
- Default behavior: copy with directory structure preserved
- Trailing `/`: directory pattern
- `#` comments and empty lines are ignored
- CRLF line endings are handled automatically

### 2. (Optional) Set branch prefix

```bash
# In your shell profile
export WORKTREE_BRANCH_PREFIX="feat"  # Creates feat-<name> branches
export WORKTREE_BRANCH_PREFIX=""       # No prefix, just <name>
# Unset = default "worktree-<name>"
```

### 3. (Optional) Configure remote tracking

```bash
# Disable automatic remote branch tracking (default: true)
git config worktree.guessRemote false
```

### 4. Use as normal

```bash
claude -w              # Creates worktree with gitignored files included
claude --worktree      # Same thing
```

## Branch Resolution

When creating a worktree, branches are resolved in order:

1. **Local branch exists** → reuse it
2. **`guessRemote=true` + remote branch exists on `origin`** → fetch and create a tracking branch
3. **No branch found** → create a new branch from HEAD

This means `claude -w my-feature` will automatically track `origin/my-feature` if it exists remotely, even if there's no local branch yet.

## Dependencies

- **jq** - JSON parsing (`brew install jq`)
- **git** - Worktree management
