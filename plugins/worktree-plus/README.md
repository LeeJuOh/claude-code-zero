# worktree-plus

Enhanced git worktree for Claude Code — follows native `git worktree` behavior with custom branch prefix, remote branch tracking, selective copy/symlink for gitignored files, and work state protection on cleanup.

## Problem

Claude Code's built-in worktree (`claude -w`) differs from native `git worktree`:

| | Default `claude -w` | worktree-plus (native git) |
|---|---|---|
| **Branch base** | Default remote branch (origin/main) | HEAD (default), or selectable via env var / git config |
| **Remote tracking** | None | `--guess-remote` support |
| **Branch prefix** | `worktree-` (fixed) | Configurable |
| **Gitignored files** | Not copied | `.worktreeinclude` copy / `.worktreelink` symlink |

## Solution

This plugin replaces the `WorktreeCreate` and `WorktreeRemove` hooks to provide native `git worktree` behavior:

- **`.worktreeinclude`** file for specifying which gitignored files/directories to copy
- **`.worktreelink`** file for specifying which gitignored files/directories to symlink (for large/heavy content)
- **Base branch selection** via env var or git config
- **`WORKTREE_BRANCH_PREFIX`** env var for custom branch naming
- **Remote branch tracking** — controlled by `git config worktree.guessRemote` (default: `true`)
- **Worktree cleanup** — `git worktree remove` + branch deletion on session exit

## Installation

```bash
claude plugin add ./plugins/worktree-plus
```

## Setup

### 1. Create `.worktreeinclude` and/or `.worktreelink` in your project root

**`.worktreeinclude`** — files/directories to **copy** (independent copy per worktree):
```gitignore
# Copy these files to worktrees
.env
.env.local
config/secrets.yaml
```

**`.worktreelink`** — files/directories to **symlink** (shared with original, no disk overhead):
```gitignore
# Symlink heavy/read-only content
references/
node_modules/
data/models/
```

**Rules (both files):**
- One path per line, relative to project root
- `#` comments and empty lines are ignored
- CRLF line endings are handled automatically
- If the same path appears in both files, whichever is processed first wins (`.worktreeinclude` runs first)

**When to use which:**
| | `.worktreeinclude` (copy) | `.worktreelink` (symlink) |
|---|---|---|
| **Best for** | Config files, secrets, small files | Large directories, read-only references |
| **Isolation** | Changes stay in worktree | Changes affect original project |
| **Disk usage** | Full copy | Zero (just a pointer) |

### 2. (Optional) Set branch prefix

```bash
# In your shell profile
export WORKTREE_BRANCH_PREFIX="feat"  # Creates feat-<name> branches
export WORKTREE_BRANCH_PREFIX=""       # No prefix, just <name>
# Unset = default "worktree-<name>"
```

### 3. (Optional) Select base branch

By default, new branches are created from HEAD. Override with an env var or git config:

```bash
# Per-command (inline, no export needed)
WORKTREE_BASE_BRANCH=develop claude -w feature

# Per-session
export WORKTREE_BASE_BRANCH="develop"
claude -w feature

# Per-repo (persistent)
git config worktreeplus.baseBranch develop
```

**Priority**: `WORKTREE_BASE_BRANCH` env var > `worktreeplus.baseBranch` git config > HEAD

### 4. (Optional) Configure remote tracking

```bash
# Disable automatic remote branch tracking (default: true)
git config worktree.guessRemote false
```

### 5. Use as normal

```bash
claude -w              # Creates worktree with gitignored files included
claude --worktree      # Same thing
```

## Branch Resolution

When creating a worktree, branches are resolved in order:

1. **Local branch exists** → reuse it
2. **`guessRemote=true` + remote branch exists on `origin`** → fetch and create a tracking branch
3. **No branch found** → create a new branch from base (`WORKTREE_BASE_BRANCH` env var > `worktreeplus.baseBranch` git config > HEAD)

This means `claude -w my-feature` will automatically track `origin/my-feature` if it exists remotely, even if there's no local branch yet.

## Worktree Log

Each worktree has a `.worktree.log` file (`<worktree-path>/.worktree.log`) that records its full lifecycle — creation, removal blocks, and removal.

**Creation entries** include:

- Timestamp, worktree name, branch name, source project root
- `.worktreeinclude` results — which files/directories were copied, skipped, or failed
- `.worktreelink` results — which files/directories were symlinked, skipped, or failed

**Removal entries** include:

- `BLOCKED` — dirty check failed, listing uncommitted changes and/or unpushed commits
- `REMOVED` — worktree was clean and successfully deleted

Example log:

```
Created: 2026-03-10 14:32:01
Name:    my-feature
Branch:  worktree-my-feature
Base:    develop
Source:  /home/user/my-project
---
Processing .worktreeinclude...
  copied: .env
  copied: config/secrets.yaml
Processing .worktreelink...
  linked: references/ -> /home/user/my-project/references
  linked: node_modules/ -> /home/user/my-project/node_modules
--- BLOCKED ---
Time:     2026-03-10 16:05:33
Path:     /home/user/my-project/.claude/worktrees/my-feature
Branch:   worktree-my-feature
Changes:  staged: 1  unstaged: 2
  M  src/main.ts
   M src/utils.ts
  ?? src/new-file.ts
```

## Worktree Cleanup

The `WorktreeRemove` hook runs a **dirty check** before deleting:

1. **Uncommitted changes** — staged, unstaged, and untracked files (`git status --porcelain`)
2. **Unpushed commits** — commits ahead of the upstream tracking branch

If any of these exist, removal is **blocked** (`exit 1`) and the details are logged to `.worktree.log`. The worktree and branch are preserved.

If clean, the hook performs cleanup:
- `git worktree remove --force` to delete the worktree directory
- `git branch -D` to delete the associated branch
- Falls back to `rm -rf` + `git worktree prune` if the first method fails

### Manual cleanup

```bash
# Force remove a preserved worktree
git worktree remove <worktree-path> --force
git branch -D <branch-name>

# List all worktrees
git worktree list
```

## Setup: Hook Registration

Worktree hooks (`WorktreeCreate`, `WorktreeRemove`) must be registered in `settings.json` to work. The plugin handles this automatically:

1. **Auto-detection** — On session start, the plugin checks if hooks are registered. If not, Claude suggests running `/worktree-plus:setup`.
2. **One-command setup** — Run `/worktree-plus:setup` to auto-configure. The plugin detects the correct scope:
   - Marketplace install → `~/.claude/settings.json` (user scope)
   - `--plugin-dir` → `.claude/settings.local.json` (project scope)
3. **Restart required** — Restart Claude Code after setup for changes to take effect.

### Manual setup (fallback)

If automatic setup doesn't work, add hooks manually to `~/.claude/settings.json`:

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

Find your plugin cache path:
```bash
ls ~/.claude/plugins/cache/
```

## Dependencies

- **jq** - JSON parsing (`brew install jq`)
- **git** - Worktree management
