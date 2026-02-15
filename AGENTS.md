# AGENTS.md

## Repository Overview

Personal marketplace for Claude Code plugins. Plugins are developed under `plugins/` and deployments are managed through `marketplace.json`.

## Directory Structure

```
.claude-plugin/marketplace.json   # Marketplace definition (plugin registry)
plugins/<plugin-name>/            # Plugin source code (git-committed)
references/                       # External reference materials (git-ignored)
```

## Plugin Development

### Plugin Component Structure

Standard plugin layout inside `plugins/<plugin-name>/`:

```
.claude-plugin/plugin.json   # Plugin manifest (required)
commands/                     # Slash commands (*.md)
agents/                       # Sub-agents (*.md)
```

### Workflow

1. **Analysis** — User provides the goal and specific reference files to read. Read ONLY those files.
2. **Implementation** — Create a new directory under `plugins/`. Never modify files in `references/`.
3. **Registration** — Add the plugin entry to `.claude-plugin/marketplace.json`.

## references/ Folder

- Git-ignored. External open-source code stored here for local reference only.
- Read files ONLY when the user explicitly specifies them using `@references/...` syntax.
- Never explore this folder on your own. Never modify files in it.

## Coding Style

- **Language**: All plugin content in English (agent.md, README.md, comments, descriptions)
- **Plugin names**: kebab-case (e.g., `notebook-researcher`, `code-reviewer`)
- **Versioning**: Semantic Versioning (e.g., `1.0.0`)
- **Descriptions**: Clear and concise
