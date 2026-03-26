# CLAUDE.md

> Navigation map. Detailed references live in `docs/`.
> Gotchas and Coding Style are inline — highest-signal content stays in the map.

## Repository Overview

Personal marketplace for Claude Code plugins. Plugins are developed under `plugins/` and deployments are managed through `marketplace.json`.

## Directory Structure

```
.claude-plugin/marketplace.json   # Marketplace definition (plugin registry)
plugins/<plugin-name>/            # Plugin source code (git-committed)
references/                       # External reference materials (git-ignored)
docs/                             # Knowledge base and reference materials
  reference/                      # Skill, hooks, env-var specs
  enhancement/                    # Enhancement proposals
  handoff/                        # Session handoff notes
  plan/                           # Planning documents
  superpowers/plans/              # Plugin implementation plans
  plugin-marketplaces.md          # Marketplace documentation
  release-workflow.md             # Release tagging process
data/                             # Session and operational data
assets/                           # Marketplace assets (badges, images)
AGENTS.md                         # Subset of CLAUDE.md for sub-agents
```

## Official Documentation

Entry point: https://code.claude.com/docs/llms.txt → fetch individual pages as `https://code.claude.com/docs/en/<page>`

Key pages: plugins.md, plugins-reference.md, plugin-marketplaces.md, discover-plugins.md, hooks.md, hooks-guide.md, skills.md, sub-agents.md, features-overview.md, memory.md, env-vars.md

See **Workflow step 1 (Docs)** for when consultation is required.

## Reference Materials

Key references for structural plugin work:

- `docs/reference/skill-building-guide.md` — Skill design spec (frontmatter, description formula, 5 design patterns)
- `docs/reference/skill-lessons-from-anthropic.md` — Practical guide (9 categories, gotchas-driven design, progressive disclosure)

Both are required reading for new plugins and structural changes. See **Workflow step 1 (Docs)**.

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
.evals/                      # Test/eval artifacts (gitignored — not distributed)
```

### Skill Design Principles

See `docs/reference/skill-lessons-from-anthropic.md` — description-as-trigger, gotchas-driven design, progressive disclosure, on-demand hooks, 9 skill categories.

### SKILL.md Quick Reference

See `docs/reference/skill-md-reference.md` — 10 frontmatter fields (name, description, allowed-tools, context, hooks, ...) and 5 string substitutions ($ARGUMENTS, ${CLAUDE_SKILL_DIR}, ...).

### Hooks Quick Reference

See `docs/reference/hooks-reference.md` — 7 events (SessionStart, PreToolUse, PostToolUse, ...), 4 hook types (command, http, prompt, agent), JSON schema with matcher patterns.

### Workflow

Applies to all plugin work: creation, modification, improvement, and refactoring.

1. **Docs** — Fetch https://code.claude.com/docs/llms.txt, identify relevant pages, and fetch them. Also consult `docs/reference/skill-building-guide.md` (spec) and `docs/reference/skill-lessons-from-anthropic.md` (practical patterns). This step is **mandatory** for: new plugins, new components (skills, agents, hooks, MCP), schema or config changes. May be **skipped** for: minor text edits, bug fixes within existing logic, or changes that don't touch plugin structure.
2. **Analysis** — User provides the goal and specific reference files to read. Read ONLY those files.
3. **Implementation** — Create or modify files under `plugins/`. Never modify files in `references/`.
4. **Documentation** — If plugin behavior changed, update `README.md` to reflect the change.
5. **Registration** — Add the plugin entry to `.claude-plugin/marketplace.json` (new plugins only).
6. **Validation** — Run the validation command below.

### Validation

```bash
unset CLAUDECODE && claude plugin validate .
```

`unset CLAUDECODE` is required to avoid nested session errors when running `claude` inside an active Claude Code session.

### Local Testing

```bash
claude --plugin-dir ./plugins/<plugin-name>
```

**Marketplace conflict**: `--plugin-dir` loads from the local directory, but if the same plugin is also installed from the marketplace, both versions load simultaneously and the cached (marketplace) version may take precedence. Disable the marketplace version before local testing:

```bash
claude plugin disable <plugin-name>@claude-code-zero   # before testing
claude plugin enable  <plugin-name>@claude-code-zero   # after testing
```

## references/ Folder

- Git-ignored. External open-source code stored here for local reference only.
- Read files ONLY when the user explicitly specifies them using `@references/...` syntax.
- Never explore this folder on your own. Never modify files in it.

## Git Workflow

### Branching Strategy

- **`develop`** — Working branch. All development happens here.
- **`main`** — Release branch. Only updated via merges from `develop`. Never commit directly.

### Commit Rules

- English only, 1-2 concise sentences focusing on the core change.
- Do NOT append `Co-Authored-By` trailers.
- Do NOT auto-push after committing. Only push when the user explicitly requests it.

### Tagging & Versioning

- Tags are created on `main` only. Never tag on `develop`.
- Tag format: `v<major>.<minor>.<patch>` (e.g., `v1.5.0`).
- Plugin versions in `marketplace.json` follow Semantic Versioning:
  - **patch** (`x.x.+1`) — Bug fixes, minor text edits, config tweaks.
  - **minor** (`x.+1.0`) — New features, structural changes, plugin renames.
  - **major** (`+1.0.0`) — Breaking changes to the plugin's interface or behavior.
- Repository tag version reflects overall release scope, not individual plugin versions.

### Release Workflow

See `docs/release-workflow.md` — 7-step process: compare branches → bump versions → merge to main → tag → push.

## Environment Variables & Data Paths

See `docs/reference/env-and-data-paths.md` — `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`, path resolution, legacy paths.

**Critical:** Data in the plugin directory is deleted on upgrade — always use `${CLAUDE_PLUGIN_DATA}` for persistent storage.

## Gotchas

**Component location**: commands/, agents/, skills/, hooks/ go in the **plugin root**, not inside `.claude-plugin/`. Putting them inside `.claude-plugin/` silently fails to load.

**source path**: `marketplace.json` source must start with `./` (relative path). `../` is not supported.

**Version priority**: If both `plugin.json` and `marketplace.json` define `version`, `plugin.json` wins. Set in one place only — this repo uses `marketplace.json` exclusively.

**Hook scripts**: Must have execute permission (`chmod +x`) and a shebang line. Use `${CLAUDE_PLUGIN_ROOT}` for paths.

**Installed plugin isolation**: Installed plugins are cached copies — they cannot reference files outside their own directory.

**Plugin agent security restrictions**: Plugin-defined agents (`agents/*.md`) silently ignore `permissionMode`, `hooks`, and `mcpServers` frontmatter fields. Only `tools`, `disallowedTools`, `model`, `maxTurns` work. To use permissionMode, the agent file must be in `.claude/agents/` or `~/.claude/agents/`, not in a plugin. (Source: sub-agents docs)

**Plugin settings.json limitations**: Plugin `settings.json` only supports the `agent` field. `permissions`, `hooks`, and other settings are NOT supported. A plugin cannot grant its subagents permission to read paths outside the project directory — there is no workaround within the plugin itself.

**Eval artifacts**: Test and autoresearch results go in `plugins/<plugin-name>/.evals/` (gitignored). Never place eval artifacts directly in the plugin root — they get distributed with marketplace installs.

**Skill allowed-tools**:
- Bare names and `Bash(command *)` command-scoped patterns work. `Write(path)` path-scoped does not.
- `$()` command substitution triggers a separate security prompt regardless of allowed-tools.
- Skills inherit parent `settings.json` permissions: `permissions.allow` is additive, `permissions.deny` overrides skill `allowed-tools` (deny > allow).

## Coding Style

- **Language**: All plugin deliverables in English (SKILL.md, agent.md, README.md, comments, descriptions, code). All development conversation (plans, discussions, questions) in Korean.
- **Plugin names**: kebab-case (e.g., `notebook-researcher`, `code-reviewer`)
- **Versioning**: Semantic Versioning (e.g., `1.0.0`). Version is set only in `marketplace.json`, not in individual `plugin.json` files (all plugins use relative-path sources).
- **Descriptions**: Clear and concise
- **Line endings**: Always Unix LF (`\n`), never Windows CRLF (`\r\n`). CRLF in shell scripts causes `command\r: not found` errors (e.g., `set -o pipefail\r`). When creating or editing any file — especially `.sh`, `.json`, `.md` — ensure LF-only line endings. If in doubt, verify with `file <path>` or `cat -A <path>` (CRLF shows as `^M$`).
