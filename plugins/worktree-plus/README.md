# worktree-plus

Enhanced git worktree for Claude Code with custom branch prefix, remote branch tracking, and selective copy/symlink for gitignored files.

## Problem

Claude Code's built-in worktree (`claude -w`) has three limitations:

1. **Gitignored files are missing** - `.env`, config files, etc. are not copied to the worktree
2. **Fixed branch prefix** - Branch names always start with `worktree`
3. **No remote branch tracking** - Always creates a new branch from HEAD, ignoring existing remote branches
4. **No symlink support** - Heavy directories like `node_modules` are either missing or fully copied

## Solution

This plugin replaces the default `WorktreeCreate`/`WorktreeRemove` hooks to add:

- **`.worktreeinclude`** file for specifying which gitignored files to copy or symlink
- **`WORKTREE_BRANCH_PREFIX`** env var for custom branch naming
- **Remote branch tracking** — automatically fetches and tracks `origin/<branch>` if it exists
- **`link:` prefix** for symlinking heavy directories instead of copying

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

# Symlink these directories (saves disk space)
link:node_modules/
link:.venv/
link:data/
```

**Rules:**
- Only gitignored files are processed (safety check)
- Default behavior: copy with directory structure preserved
- `link:` prefix: create symlink to original
- Trailing `/`: directory pattern
- `#` comments and empty lines are ignored
- Glob patterns support simple wildcards (e.g., `.env*`) but NOT `**` recursive patterns

### 2. (Optional) Set branch prefix

```bash
# In your shell profile
export WORKTREE_BRANCH_PREFIX="feat"  # Creates feat-<name> branches
export WORKTREE_BRANCH_PREFIX=""       # No prefix, just <name>
# Unset = default "worktree-<name>"
```

### 3. Use as normal

```bash
claude -w              # Creates worktree with gitignored files included
claude --worktree      # Same thing
```

## Branch Resolution

When creating a worktree, branches are resolved in 3 steps:

1. **Local branch exists** → reuse it
2. **Remote branch exists on `origin`** → fetch and create a tracking branch
3. **No branch found** → create a new branch from HEAD

This means `claude -w my-feature` will automatically track `origin/my-feature` if it exists remotely, even if there's no local branch yet.

## Dependencies

- **jq** - JSON parsing (`brew install jq`)
- **git** - Worktree management
