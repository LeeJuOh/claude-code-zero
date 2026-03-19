---
name: setup
description: Register WorktreeCreate and WorktreeRemove hooks in settings.json for worktree-plus. Use when worktree hooks are not firing, when prompted by the SessionStart auto-check, or when user mentions "setup worktree", "configure worktree hooks", "worktree not working", "hooks not registered", "fix worktree hooks", "worktree-plus not working", "worktree falls back to default". Also use when Claude's SessionStart context includes "worktree-plus" hook registration or jq warnings, or when the user reports that `claude -w` is not using custom worktree behavior.
allowed-tools: Bash
---

# worktree-plus Hook Setup

Register WorktreeCreate and WorktreeRemove hooks in the appropriate settings.json so that `claude -w` uses worktree-plus instead of the built-in worktree behavior.

For detailed configuration (`.worktreeinclude`, `.worktreelink`, branch prefix, remote tracking), see `${CLAUDE_SKILL_DIR}/../../README.md`.

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

## Gotchas

- **Restart required after setup**: Hook changes in `settings.json` only take effect after restarting Claude Code. The file watcher picks up most config changes live, but hook registration is loaded at session startup.
- **jq is mandatory**: All hook scripts depend on `jq` for JSON parsing. If `jq` is missing, setup will fail silently and worktrees will fall back to built-in behavior.
- **Marketplace vs local scope conflict**: If the plugin is installed from the marketplace AND loaded via `--plugin-dir` simultaneously, both versions run and the cached (marketplace) version may take precedence. Disable the marketplace version first: `claude plugin disable worktree-plus@<marketplace>`.
- **CRLF line endings in `.worktreeinclude`/`.worktreelink`**: Windows-style line endings cause paths to include invisible `\r`, making copies/symlinks fail silently. The scripts handle CRLF automatically, but if you hit issues, check with `cat -A .worktreeinclude` (CRLF shows as `^M$`).
- **Existing worktree reuse**: If a worktree with the same name already exists, it is reused instead of creating a new one. This prevents infinite loading but means you get the existing state, not a fresh checkout.
