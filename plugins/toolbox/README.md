# toolbox

Personal utility commands and tools for Claude Code.

## Installation

### 1. Add the marketplace

```shell
/plugin marketplace add LeeJuOh/claude-code-zero
```

### 2. Install the plugin

```shell
/plugin install toolbox@claude-code-zero
```

Install with a specific scope:

```shell
# User scope (default, available across all projects)
/plugin install toolbox@claude-code-zero --scope user

# Project scope (shared with team via version control)
/plugin install toolbox@claude-code-zero --scope project
```

### 3. Verify installation

Run `/plugin` and check the **Installed** tab to confirm.

### Plugin management

```shell
/plugin disable toolbox@claude-code-zero    # Disable
/plugin enable toolbox@claude-code-zero     # Re-enable
/plugin update toolbox@claude-code-zero     # Update
/plugin uninstall toolbox@claude-code-zero  # Uninstall
```

## Commands

### `/fetch-sitemap`

Extract URLs from an XML sitemap with optional regex filtering.

**Usage:**

```
/fetch-sitemap <sitemap-url> [pattern]
```

**Examples:**

```
/fetch-sitemap https://example.com/sitemap.xml
/fetch-sitemap https://example.com/sitemap.xml en
/fetch-sitemap https://example.com/sitemap.xml 'skills|hooks'
```

### `/handoff`

Write or update a handoff document so the next agent with fresh context can continue this work.

**Usage:**

```
/handoff [path]
```

**Examples:**

```
/handoff                          # defaults to HANDOFF.md
/handoff handoffs/auth-refactor.md
/handoff handoffs/api-migration.md
```

### `/worktree`

Create a git worktree for an existing or new branch with `.worktreeinclude` file copying.

**Usage:**

```
/worktree <branch> [path]
```

**Examples:**

```
/worktree feature/auth              # existing or new branch
/worktree fix/login-bug work/login  # specific path
/worktree develop                   # checkout existing branch
```

## License

MIT
