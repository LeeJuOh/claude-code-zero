---
name: worktree-plus
description: Usage guide for worktree-plus plugin. Use when user asks about .worktreeinclude format, worktree branch prefix, how to copy or symlink gitignored files in worktrees, or mentions "worktree-plus".
---

Show the user how to configure worktree-plus based on their question. If the user has a `.worktreeinclude` file, read it and give specific advice. If not, guide them to create one based on their project structure.

## What This Plugin Does

worktree-plus enhances Claude Code's built-in worktree (`claude -w`) with:

1. **Custom branch prefix** via `WORKTREE_BRANCH_PREFIX` environment variable
2. **Selective copy/symlink of gitignored files** via `.worktreeinclude`

It replaces the default `WorktreeCreate` and `WorktreeRemove` hooks.

## .worktreeinclude File

Create `.worktreeinclude` in the project root to specify which gitignored files should be available in worktrees.

### Format

```gitignore
# Files to copy (default behavior)
.env
.env.local
config/secrets.yaml

# Directories/files to symlink (link: prefix)
link:node_modules/
link:.venv/
link:data/
```

### Rules

- Only processes files that are gitignored (safety check)
- Default: **copy** (preserves directory structure)
- `link:` prefix: creates a **symlink** to the original
- Trailing `/` indicates a directory pattern
- Lines starting with `#` are comments
- Empty lines are ignored

### When to Copy vs Symlink

| Use Case | Recommendation |
|----------|---------------|
| `.env`, config files | Copy (worktree may need different values) |
| `node_modules/` | Symlink (large, read-only, save disk space) |
| `.venv/` | Symlink (large, shared across worktrees) |
| Large data directories | Symlink |

## WORKTREE_BRANCH_PREFIX

Controls the branch name prefix for new worktrees.

| Setting | Branch Name |
|---------|-------------|
| Not set (default) | `worktree-<name>` |
| `WORKTREE_BRANCH_PREFIX=""` | `<name>` (no prefix) |
| `WORKTREE_BRANCH_PREFIX="feat"` | `feat-<name>` |

Set it in your shell profile or `.claude/settings.json` env block.

## Dependencies

- `jq` (for JSON parsing)
- `git` (for worktree management)
