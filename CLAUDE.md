# CLAUDE.md

## Repository Overview

Personal marketplace for Claude Code plugins. Plugins are developed under `plugins/` and deployments are managed through `marketplace.json`.

## Directory Structure

```
.claude-plugin/marketplace.json   # Marketplace definition (plugin registry)
plugins/<plugin-name>/            # Plugin source code (git-committed)
references/                       # External reference materials (git-ignored)
```

## Official Documentation

For any plugin or marketplace related work (development, configuration, troubleshooting), always consult the official docs first:

1. Fetch the entry point: https://code.claude.com/docs/llms.txt
2. Identify the relevant page URLs from the index
3. Fetch those pages to get the latest spec

Key pages: plugins.md, plugins-reference.md, plugin-marketplaces.md, discover-plugins.md, hooks.md, skills.md, sub-agents.md

Always verify schemas, field types, and supported options against the official docs before making changes.

## Plugin Development

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
- Do NOT append `Co-Authored-By` trailers to commit messages.
- Do NOT auto-push after committing. Only push when the user explicitly requests it.

### Release Workflow (Tagging on main)

When the user requests a tag on `main`:

1. **Confirm branch** — Verify you are on `main`. Abort if not.
2. **Ask about marketplace update** — Before creating the tag, ask the user which plugins in `marketplace.json` should have their `ref` and `version` updated to the new tag. Show the current `ref`/`version` of each plugin for reference.
3. **Update marketplace.json** — For selected plugins, update `ref` to the new tag (e.g., `v1.1.0`) and `version` to match (e.g., `1.1.0`).
4. **Commit** — Commit the marketplace.json change (e.g., `release: update marketplace refs to <tag>`).
5. **Create tag** — Create the annotated tag on the commit that includes the marketplace update.
6. **Confirm push** — Ask the user before pushing the tag and commits to remote.

## Coding Style

- **Language**: All plugin content in English (SKILL.md, agent.md, README.md, comments, descriptions)
- **Plugin names**: kebab-case (e.g., `notebook-researcher`, `code-reviewer`)
- **Versioning**: Semantic Versioning (e.g., `1.0.0`)
- **Descriptions**: Clear and concise
