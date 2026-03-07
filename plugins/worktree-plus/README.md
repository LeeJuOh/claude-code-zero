# worktree-plus

Enhanced git worktree for Claude Code — follows native `git worktree` behavior with custom branch prefix, remote branch tracking, selective copy for gitignored files, and work state protection on cleanup.

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

Worktree cleanup uses a two-layer defense to protect unsaved work:

### Layer 1: Stop hook (user interaction)

When Claude finishes responding inside a worktree with uncommitted changes, the Stop hook blocks and asks the user to choose:

- **Keep** — worktree is preserved with all changes intact
- **Remove** — creates a force-remove marker, then WorktreeRemove deletes the worktree

The Stop hook only fires on normal session exit (not Ctrl+C) and asks only once per session.

### Layer 2: WorktreeRemove (safe-by-default fallback)

When the WorktreeRemove hook runs, it checks the worktree state:

1. **Force-remove marker exists** → force delete (user explicitly chose "remove")
2. **Dirty** (uncommitted changes, unpushed commits, or stashes) → preserve and print manual cleanup commands
3. **Clean** → auto-delete via `git worktree remove` + branch cleanup

### Scenario matrix

| Exit method | Work state | Stop hook | WorktreeRemove | Result |
|---|---|---|---|---|
| Normal exit | dirty | asks keep/remove | marker or dirty check | user decides |
| Normal exit | clean | passes through | clean → auto-delete | auto-deleted |
| Ctrl+C | dirty | does not fire | dirty → preserve | **preserved** |
| Ctrl+C | clean | does not fire | clean → auto-delete | auto-deleted |

### Manual cleanup

```bash
# Resume work in a preserved worktree
cd <worktree-path>

# Force remove a preserved worktree
git worktree remove <worktree-path> --force
git branch -D <branch-name>

# List all worktrees
git worktree list
```

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
