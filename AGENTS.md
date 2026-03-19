# AGENTS.md

## Repository Overview

Personal marketplace for Claude Code plugins. Plugins are developed under `plugins/` and deployments are managed through `marketplace.json`.

## Directory Structure

```
.claude-plugin/marketplace.json   # Marketplace definition (plugin registry)
plugins/<plugin-name>/            # Plugin source code (git-committed)
references/                       # External reference materials (git-ignored)
docs/                             # Knowledge base and reference materials
```

## Reference Materials

The `docs/` directory contains knowledge base and reference materials.

Key references:
- `docs/reference/skill-building-guide.md` — Skill design spec: frontmatter, description formula, 5 design patterns, testing, checklist
- `docs/reference/skill-lessons-from-anthropic.md` — Practical guide: 9 categories, gotchas-driven design, progressive disclosure, on-demand hooks

## Plugin Development

### Plugin Component Structure

Standard plugin layout inside `plugins/<plugin-name>/`:

```
.claude-plugin/plugin.json   # Plugin manifest (no version — version lives in marketplace.json)
commands/                     # Slash commands (legacy; use skills/ for new skills)
skills/                       # Skills with SKILL.md
agents/                       # Sub-agents (*.md)
hooks/                        # Hooks (hooks.json + scripts)
.mcp.json                    # MCP server configuration (optional)
.lsp.json                    # LSP server configuration (optional)
settings.json                # Default settings, e.g. { "agent": "name" } (optional)
```

### Workflow

Applies to all plugin work: creation, modification, improvement, and refactoring.

1. **Docs** — For new plugins or structural changes, fetch https://code.claude.com/docs/en/ relevant pages and consult `docs/reference/` files.
2. **Analysis** — Understand the goal and read relevant files.
3. **Implementation** — Create or modify files under `plugins/`. Never modify files in `references/`.
4. **Registration** — Add the plugin entry to `.claude-plugin/marketplace.json` (new plugins only).
5. **Validation** — Run `unset CLAUDECODE && claude plugin validate .` to verify plugin structure.

## references/ Folder

- Git-ignored. External open-source code stored here for local reference only.
- Never explore this folder on your own. Never modify files in it.

## Git Workflow

- **`develop`** — Working branch. All development happens here. Never commit directly to `main`.
- English only, 1-2 concise sentences focusing on the core change.
- Do NOT append `Co-Authored-By` trailers.
- Do NOT auto-push after committing. Only push when the user explicitly requests it.

## Gotchas

**Component location**: commands/, agents/, skills/, hooks/ go in the **plugin root**, not inside `.claude-plugin/`. Putting them inside `.claude-plugin/` silently fails to load.

**source path**: `marketplace.json` source must start with `./` (relative path). `../` is not supported.

**Version priority**: If both `plugin.json` and `marketplace.json` define `version`, `plugin.json` wins. Set in one place only — this repo uses `marketplace.json` exclusively.

**Hook scripts**: Must have execute permission (`chmod +x`) and a shebang line. Use `${CLAUDE_PLUGIN_ROOT}` for paths.

**Installed plugin isolation**: Installed plugins are cached copies — they cannot reference files outside their own directory.

**Plugin agent security restrictions**: Plugin-defined agents (`agents/*.md`) silently ignore `permissionMode`, `hooks`, and `mcpServers` frontmatter fields. Only `tools`, `disallowedTools`, `model`, `maxTurns` work. To use permissionMode, the agent file must be in `.claude/agents/` or `~/.claude/agents/`, not in a plugin.

**Plugin settings.json limitations**: Plugin `settings.json` only supports the `agent` field. `permissions`, `hooks`, and other settings are NOT supported.

**Skill allowed-tools**:
- Bare names and `Bash(command *)` command-scoped patterns work. `Write(path)` path-scoped does not.
- `$()` command substitution triggers a separate security prompt regardless of allowed-tools.
- Skills inherit parent `settings.json` permissions: `permissions.allow` is additive, `permissions.deny` overrides skill `allowed-tools` (deny > allow).

## Plugin Data Paths

| Variable | Description |
|----------|-------------|
| `${CLAUDE_PLUGIN_ROOT}` | Plugin install directory (changes on update — do not store data here) |
| `${CLAUDE_PLUGIN_DATA}` | Persistent per-plugin data directory (survives updates) |

| Purpose | Path |
|---------|------|
| Persistent data (reports, config) | `${CLAUDE_PLUGIN_DATA}` (preferred) or `~/.claude-code-zero/<plugin-name>/` (legacy) |
| Temporary data (clone tmp) | `/tmp/<plugin-name>/` |

**Critical:** Data in the plugin directory is deleted on upgrade — always use `${CLAUDE_PLUGIN_DATA}` for persistent storage.

## Coding Style

- **Language**: All plugin deliverables in English (SKILL.md, agent.md, README.md, comments, descriptions, code).
- **Plugin names**: kebab-case (e.g., `notebook-researcher`, `code-reviewer`)
- **Versioning**: Semantic Versioning (e.g., `1.0.0`). Version is set only in `marketplace.json`, not in individual `plugin.json` files (all plugins use relative-path sources).
- **Descriptions**: Clear and concise
- **Line endings**: Always Unix LF (`\n`), never Windows CRLF (`\r\n`). CRLF in shell scripts causes `command\r: not found` errors (e.g., `set -o pipefail\r`). When creating or editing any file — especially `.sh`, `.json`, `.md` — ensure LF-only line endings. If in doubt, verify with `file <path>` or `cat -A <path>` (CRLF shows as `^M$`).
