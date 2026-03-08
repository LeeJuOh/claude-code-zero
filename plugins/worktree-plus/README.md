# worktree-plus

Enhanced git worktree for Claude Code — follows native `git worktree` behavior with custom branch prefix, remote branch tracking, selective copy/symlink for gitignored files, and work state protection on cleanup.

## Problem

Claude Code's built-in worktree (`claude -w`) differs from native `git worktree`:

| | Default `claude -w` | worktree-plus (native git) |
|---|---|---|
| **Branch base** | Default remote branch (origin/main) | HEAD (current commit) |
| **Remote tracking** | None | `--guess-remote` support |
| **Branch prefix** | `worktree-` (fixed) | Configurable |
| **Gitignored files** | Not copied | `.worktreeinclude` copy / `.worktreelink` symlink |

## Solution

This plugin replaces the `WorktreeCreate` and `WorktreeRemove` hooks to provide native `git worktree` behavior:

- **`.worktreeinclude`** file for specifying which gitignored files/directories to copy
- **`.worktreelink`** file for specifying which gitignored files/directories to symlink (for large/heavy content)
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
