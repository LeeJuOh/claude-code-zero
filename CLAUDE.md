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

Entry point: https://code.claude.com/docs/llms.txt

Key pages: plugins.md, plugins-reference.md, plugin-marketplaces.md, discover-plugins.md, hooks.md, skills.md, sub-agents.md

See **Workflow step 1 (Docs)** for the mandatory consultation process.

## Plugin Development

### Plugin Component Structure

Standard plugin layout inside `plugins/<plugin-name>/`:

```
.claude-plugin/plugin.json   # Plugin manifest (optional, auto-discovers if omitted)
commands/                     # Slash commands — legacy; use skills/ for new skills
skills/                       # Skills with SKILL.md
agents/                       # Sub-agents (*.md)
hooks/                        # Hooks (hooks.json + scripts)
.mcp.json                    # MCP server configuration (optional)
```

### Workflow

Applies to all plugin work: creation, modification, improvement, and refactoring.

1. **Docs** — Fetch https://code.claude.com/docs/llms.txt, identify relevant pages, and fetch them. Verify schemas and options against the latest spec before making any changes.
2. **Analysis** — User provides the goal and specific reference files to read. Read ONLY those files.
3. **Implementation** — Create or modify files under `plugins/`. Never modify files in `references/`.
4. **Registration** — Add the plugin entry to `.claude-plugin/marketplace.json` (new plugins only).
5. **Validation** — Run the validation command below.

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

1. **Ask about marketplace update** — Before creating the tag, ask the user which plugins in `marketplace.json` should have their `ref` and `version` updated to the new tag. Show the current `ref`/`version` of each plugin for reference.
2. **Update on develop** — On `develop`, update `marketplace.json` for selected plugins (`ref` to the new tag, `version` to match). Commit (e.g., `release: update marketplace refs to <tag>`).
3. **Merge to main** — Switch to `main` and merge `develop`.
4. **Create tag** — Create the annotated tag on `main`.
5. **Switch back** — Return to `develop`.
6. **Confirm push** — Ask the user before pushing `main`, `develop`, and the tag to remote.

## Coding Style

- **Language**: All plugin content in English (SKILL.md, agent.md, README.md, comments, descriptions)
- **Plugin names**: kebab-case (e.g., `notebook-researcher`, `code-reviewer`)
- **Versioning**: Semantic Versioning (e.g., `1.0.0`)
- **Descriptions**: Clear and concise
