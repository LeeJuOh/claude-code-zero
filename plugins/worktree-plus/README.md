# worktree-plus

Enhanced git worktree for Claude Code — follows native `git worktree` behavior with custom branch prefix, remote branch tracking, and selective copy for gitignored files.

## Problem

Claude Code's built-in worktree (`claude -w`) differs from native `git worktree`:

| | Default `claude -w` | worktree-plus (native git) |
|---|---|---|
| **Branch base** | Default remote branch (origin/main) | HEAD (current commit) |
| **Remote tracking** | None | `--guess-remote` support |
| **Branch prefix** | `worktree-` (fixed) | Configurable |
| **Gitignored files** | Not copied | `.worktreeinclude` selective copy |

## Solution

This plugin replaces the `WorktreeCreate` and `WorktreeRemove` hooks to provide native `git worktree` behavior:

- **`.worktreeinclude`** file for specifying which gitignored files/directories to copy
- **`WORKTREE_BRANCH_PREFIX`** env var for custom branch naming
- **Remote branch tracking** — controlled by `git config worktree.guessRemote` (default: `true`)
- **Worktree cleanup** — `git worktree remove` + branch deletion on session exit

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

## Worktree Cleanup

On session exit, Claude Code handles the cleanup flow:

1. Detects whether the worktree has uncommitted changes
2. **No changes** → removes automatically / **Changes exist** → prompts to keep or remove
3. If removal is chosen → `WorktreeRemove` hook runs:
   - `git worktree remove` to clean up the worktree
   - Deletes the branch (only if fully merged; unmerged branches are kept)

## Known Limitations

### Plugin hook recognition

Worktree hooks (`WorktreeCreate`, `WorktreeRemove`) defined in a plugin's `hooks/hooks.json` may not be recognized automatically. If the hooks don't fire, add them manually to your `~/.claude/settings.json`:

```json
{
  "hooks": {
    "WorktreeCreate": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "<plugin-cache-path>/hooks/scripts/worktree-create.sh"
          }
        ]
      }
    ],
    "WorktreeRemove": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "<plugin-cache-path>/hooks/scripts/worktree-remove.sh"
          }
        ]
      }
    ]
  }
}
```

Find your plugin cache path with:
```bash
ls ~/.claude/plugins/cache/
```

## Dependencies

- **jq** - JSON parsing (`brew install jq`)
- **git** - Worktree management
