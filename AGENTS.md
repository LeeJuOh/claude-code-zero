# AGENTS.md

> Shared knowledge base for all coding agents. CLAUDE.md imports this file.
> Detailed references live in `docs/` — see `docs/INDEX.md`.

## Repository Overview

Personal marketplace for Claude Code plugins. Plugins are developed under `plugins/` and deployments are managed through `marketplace.json`.

## Directory Structure

```
.claude-plugin/marketplace.json   # Marketplace definition (plugin registry)
plugins/<plugin-name>/            # Local plugin source code (git-committed)
# External repo plugins registered via GitHub source object in marketplace.json
# Lab/beta plugins use `lab-` name prefix (e.g., lab-harness-zero)
references/                       # External reference materials (git-ignored)
docs/                             # Knowledge base — see docs/INDEX.md
data/                             # Session and operational data
video/                            # Demo videos and media assets
```

## Reference Materials

Key references for structural plugin work:

- `docs/reference/skill-building-guide.md` — Skill design spec (frontmatter, description formula, 5 design patterns)
- `docs/reference/skill-lessons-from-anthropic.md` — Practical guide (9 categories, gotchas-driven design, progressive disclosure)

Both are required reading for new plugins and structural changes.

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

1. **Docs** — For new plugins or structural changes, consult `docs/reference/` files and official documentation.
2. **Analysis** — User provides the goal and specific reference files to read. Read ONLY those files.
3. **Implementation** — Create or modify files under `plugins/`. Never modify files in `references/`.
4. **Documentation** — If plugin behavior changed, update `README.md` to reflect the change.
5. **Registration** — Add the plugin entry to `.claude-plugin/marketplace.json` (new plugins only).
6. **Validation** — Run `unset CLAUDECODE && claude plugin validate .`

### Validation

```bash
unset CLAUDECODE && claude plugin validate .
```

`unset CLAUDECODE` is required to avoid nested session errors when running `claude` inside an active session.

## references/ Folder

- Git-ignored. External open-source code stored here for local reference only.
- When cloning external repos for research, always clone into `references/<repo-name>`.
- Read-only benchmark/reference projects live here for insight gathering and comparison.
- Never modify files in `references/`; use them only for reading, benchmarking, and pattern discovery.

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

## Plugin Data Paths

| Variable | Description |
|----------|-------------|
| `${CLAUDE_PLUGIN_ROOT}` | Plugin install directory (changes on update — do not store data here) |
| `${CLAUDE_PLUGIN_DATA}` | Persistent per-plugin data directory (survives updates) |

**Critical:** Data in the plugin directory is deleted on upgrade — always use `${CLAUDE_PLUGIN_DATA}` for persistent storage. See `docs/reference/env-and-data-paths.md`.

## Gotchas

**Component location**: commands/, agents/, skills/, hooks/ go in the **plugin root**, not inside `.claude-plugin/`. Putting them inside `.claude-plugin/` silently fails to load.

**source path**: `marketplace.json` source must start with `./` (local) or be a source object (external). `../` is not supported.

**Version priority**: If both `plugin.json` and `marketplace.json` define `version`, `plugin.json` wins silently. Local plugins: set version in `marketplace.json` only. External repo plugins: set version in `plugin.json` only.

**Version bump required**: Changing plugin code without bumping version means existing users won't see the update — cached copies persist until version changes.

**Plugin name format**: Names must be kebab-case only (lowercase, digits, hyphens). Spaces or brackets like `[Lab] my-plugin` fail validation. Use `lab-` prefix for experimental plugins.

**Installed plugin isolation**: Installed plugins are cached copies — they cannot reference files outside their own directory.

**Plugin agent security**: Plugin agents (`agents/*.md`) silently ignore `permissionMode`, `hooks`, and `mcpServers` frontmatter. Supported: `tools`, `disallowedTools`, `model`, `maxTurns`, `skills`, `memory`, `background`, `isolation`.

**Plugin settings.json**: Only the `agent` field is supported. `permissions`, `hooks`, and other settings are silently ignored.

**Eval artifacts**: Results go in `plugins/<plugin-name>/.evals/` (gitignored). Never place eval artifacts in the plugin root — they get distributed with marketplace installs.

**Research double-check**: Always verify web search / LLM research results against actual code and READMEs in `references/` before writing into spec or design documents. Research outputs can fabricate product features entirely (confirmed: HarnessKit features were completely mischaracterized).

**Skill allowed-tools**: Bare names and `Bash(command *)` command-scoped patterns work. `Write(path)` path-scoped does not. `$()` command substitution triggers a separate security prompt regardless of allowed-tools. Skills inherit parent `settings.json` permissions: `permissions.allow` is additive, `permissions.deny` overrides skill `allowed-tools` (deny > allow).

**Plugin independence**: A plugin must never assume another plugin is installed. Don't route users to a specific plugin by name (e.g., "use claw-mo instead") — say "these features are unavailable outside this environment" and let the user's own setup handle it. Each plugin is an independent unit; cross-plugin dependencies create silent failures when one is uninstalled.

## Coding Style

- **Language**: All plugin deliverables in English (SKILL.md, agent.md, README.md, comments, descriptions, code). All development conversation (plans, discussions, questions) in Korean.
- **Plugin names**: kebab-case (e.g., `notebook-researcher`, `code-reviewer`)
- **Versioning**: Semantic Versioning (e.g., `1.0.0`). Local plugins (`./` source): version in `marketplace.json` only. External repo plugins (GitHub source): version in `plugin.json` only.
- **Descriptions**: Clear and concise
- **Line endings**: Always Unix LF (`\n`), never Windows CRLF (`\r\n`). CRLF in shell scripts causes `command\r: not found` errors (e.g., `set -o pipefail\r`). When creating or editing any file — especially `.sh`, `.json`, `.md` — ensure LF-only line endings.
