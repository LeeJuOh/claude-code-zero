---
name: setup
description: Register WorktreeCreate and WorktreeRemove hooks in settings.json for worktree-plus. Use when worktree hooks are not firing, when prompted by the SessionStart auto-check, or when user mentions "setup worktree", "configure worktree hooks", "worktree not working", "hooks not registered", "fix worktree hooks". Also use when Claude's SessionStart context includes "worktree-plus" hook registration warnings.
allowed-tools: Bash
---

# worktree-plus Hook Setup

Register WorktreeCreate and WorktreeRemove hooks in the appropriate settings.json so that `claude -w` uses worktree-plus instead of the built-in worktree behavior.

## What it does

The setup script detects the install scope and configures hooks accordingly:

- **Marketplace install** (`~/.claude/plugins/cache/...`) → writes to `~/.claude/settings.json`
- **Local install** (`--plugin-dir`) → writes to `.claude/settings.local.json`

It handles three cases per hook: missing (adds), stale path (updates), already correct (skips). Existing hooks from other plugins are preserved.

## Prerequisites

Requires `jq` for JSON manipulation. If the script fails with "jq: command not found", install it first:
```bash
brew install jq    # macOS
apt install jq     # Linux
```

## Run

```bash
bash "${CLAUDE_SKILL_DIR}/../../hooks/scripts/setup-hooks.sh"
```

## After

1. Report the script output to the user
2. If successful, tell the user to **restart Claude Code** for changes to take effect
3. If the script reported "alongside existing hooks", explain that other plugins' hooks for the same event were preserved
4. If the script failed, check that `jq` is installed and the settings file path is writable
