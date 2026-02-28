# AGENTS.md

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

See **Workflow step 1 (Docs)** for when consultation is required.

## Reference Materials

`docs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf` — Anthropic's official guide covering skill fundamentals, YAML frontmatter, progressive disclosure, testing, distribution, and patterns.

Required reference for structural plugin work. See **Workflow step 1 (Docs)**.

## Plugin Development

### Plugin Component Structure

Standard plugin layout inside `plugins/<plugin-name>/`:

```
.claude-plugin/plugin.json   # Plugin manifest (no version — version lives in marketplace.json)
commands/                     # Slash commands — legacy; use skills/ for new skills
skills/                       # Skills with SKILL.md
agents/                       # Sub-agents (*.md)
hooks/                        # Hooks (hooks.json + scripts)
.mcp.json                    # MCP server configuration (optional)
```

### Workflow

Applies to all plugin work: creation, modification, improvement, and refactoring.

1. **Docs** — Fetch https://code.claude.com/docs/llms.txt, identify relevant pages, and fetch them. Also consult `docs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf`. This step is **mandatory** for: new plugins, new components (skills, agents, hooks, MCP), schema or config changes. May be **skipped** for: minor text edits, bug fixes within existing logic, or changes that don't touch plugin structure.
2. **Analysis** — User provides the goal and specific reference files to read. Read ONLY those files.
3. **Implementation** — Create or modify files under `plugins/`. Never modify files in `references/`.
4. **Registration** — Add the plugin entry to `.claude-plugin/marketplace.json` (new plugins only).
5. **Validation** — Run the validation command below.

### Validation

```bash
unset CLAUDECODE && claude plugin validate .
```

`unset CLAUDECODE` is required to avoid nested session errors when running `claude` inside an active Claude Code session.

Note: Sub-agents cannot execute CLI commands directly. Delegate validation to the main session or ask the user to run it.

### Local Testing

```bash
claude --plugin-dir ./plugins/<plugin-name>
```

**Marketplace conflict**: `--plugin-dir` loads from the local directory, but if the same plugin is also installed from the marketplace, both versions load simultaneously and the cached (marketplace) version may take precedence. Disable the marketplace version before local testing:

```bash
claude plugin disable <plugin-name>@claude-code-zero   # before testing
claude plugin enable  <plugin-name>@claude-code-zero   # after testing
```

Note: Sub-agents cannot execute CLI commands directly. Delegate testing to the main session or ask the user to run it.

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

1. **Ask about marketplace update** — Before creating the tag, ask the user which plugins in `marketplace.json` should have their `version` bumped. Show the current `version` of each plugin and what changed since `main` for reference.
2. **Update on develop** — On `develop`, update `marketplace.json` for selected plugins. Commit (e.g., `release: bump versions for <tag>`).
3. **Merge to main** — Switch to `main` and merge `develop`.
4. **Create tag** — Create the annotated tag on `main`.
5. **Switch back** — Return to `develop`.
6. **Confirm push** — Ask the user before pushing `main`, `develop`, and the tag to remote.

## Coding Style

- **Language**: All plugin deliverables in English (SKILL.md, agent.md, README.md, comments, descriptions, code). All development conversation (plans, discussions, questions) in Korean.
- **Plugin names**: kebab-case (e.g., `notebook-researcher`, `code-reviewer`)
- **Versioning**: Semantic Versioning (e.g., `1.0.0`). Version is set only in `marketplace.json`, not in individual `plugin.json` files (all plugins use relative-path sources).
- **Descriptions**: Clear and concise
