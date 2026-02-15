# CLAUDE.md

## Repository Overview

Personal marketplace for Claude Code plugins. Plugins are developed under `plugins/` and deployments are managed through `marketplace.json`.

## Directory Structure

```
.claude-plugin/marketplace.json   # Marketplace definition (plugin registry)
plugins/<plugin-name>/            # Plugin source code (git-committed)
references/                       # External reference materials (git-ignored)
```

## Plugin Development

### Official Documentation

Before developing a plugin, fetch the latest spec from the official documentation:

- Entry point: https://code.claude.com/docs/llms.txt
- Key references: plugins.md, plugins-reference.md, hooks.md, skills.md, sub-agents.md

Always verify plugin.json schema, hook event types, skill frontmatter fields, and agent frontmatter fields against the official docs before implementation.

### Plugin Component Structure

Standard plugin layout inside `plugins/<plugin-name>/`:

```
.claude-plugin/plugin.json   # Plugin manifest (required)
commands/                     # Slash commands (*.md)
skills/                       # Skills with SKILL.md
agents/                       # Sub-agents (*.md)
hooks/                        # Hooks (hooks.json + scripts)
.mcp.json                    # MCP server configuration (optional)
```

### Workflow

1. **Analysis** — User provides the goal and specific reference files to read. Read ONLY those files.
2. **Implementation** — Create a new directory under `plugins/`. Never modify files in `references/`.
3. **Registration** — Add the plugin entry to `.claude-plugin/marketplace.json`.
4. **Validation** — Run the validation command below.

### Validation

```bash
unset CLAUDECODE && claude plugin validate .
```

`unset CLAUDECODE` is required to avoid nested session errors when running `claude` inside an active Claude Code session.

### Local Testing

```bash
claude --plugin-dir ./plugins/<plugin-name>
```

## references/ Folder

- Git-ignored. External open-source code stored here for local reference only.
- Read files ONLY when the user explicitly specifies them using `@references/...` syntax.
- Never explore this folder on your own. Never modify files in it.

## Git Workflow

- Tags must be created on `main` only. Never tag on `develop`.
- Commit messages: English only, 1-2 concise sentences focusing on the core change.

## Coding Style

- **Language**: All plugin content in English (SKILL.md, agent.md, README.md, comments, descriptions)
- **Plugin names**: kebab-case (e.g., `notebook-researcher`, `code-reviewer`)
- **Versioning**: Semantic Versioning (e.g., `1.0.0`)
- **Descriptions**: Clear and concise
