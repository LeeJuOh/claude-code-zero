# CLAUDE.md

> **Quick Index**
> [Overview](#repository-overview) · [Directory Structure](#directory-structure) · [Official Docs](#official-documentation) · [Reference Materials](#reference-materials)
> [Plugin Development](#plugin-development): [Component Structure](#plugin-component-structure) · [Design Principles](#skill-design-principles) · [SKILL.md Reference](#skillmd-quick-reference) · [Hooks Reference](#hooks-quick-reference) · [Workflow](#workflow) · [Validation](#validation) · [Local Testing](#local-testing)
> [references/ Folder](#references-folder) · [Git Workflow](#git-workflow): [Branching](#branching-strategy) · [Commits](#commit-rules) · [Versioning](#tagging--versioning) · [Rename](#plugin-rename-handling) · [Release](#release-workflow-tagging-on-main)
> [Env & Data Paths](#environment-variables--data-paths) · [Gotchas](#gotchas) · [Coding Style](#coding-style)

## Repository Overview

Personal marketplace for Claude Code plugins. Plugins are developed under `plugins/` and deployments are managed through `marketplace.json`.

## Directory Structure

```
.claude-plugin/marketplace.json   # Marketplace definition (plugin registry)
plugins/<plugin-name>/            # Plugin source code (git-committed)
references/                       # External reference materials (git-ignored)
docs/reference/                   # Skill design guides (git-ignored, local only)
data/                             # Session and operational data
assets/                           # Marketplace assets (badges, images)
AGENTS.md                         # Subset of CLAUDE.md for sub-agents
```

## Official Documentation

Entry point: https://code.claude.com/docs/llms.txt

Key pages: plugins.md, plugins-reference.md, plugin-marketplaces.md, discover-plugins.md, hooks.md, hooks-guide.md, skills.md, sub-agents.md, features-overview.md, memory.md, env-vars.md

See **Workflow step 1 (Docs)** for when consultation is required.

## Reference Materials

> **Note:** The `docs/` directory is gitignored — these files exist locally only and are not tracked in git.

`docs/reference/skill-building-guide.md` — Skill design spec: YAML frontmatter field reference, description writing formula, instruction best practices, 5 design patterns, testing approach, troubleshooting, and quick checklist. Extracted from Anthropic's official PDF guide.

`docs/reference/skill-lessons-from-anthropic.md` — Practical skill guide from Anthropic's internal usage: 9 skill categories, gotchas-driven design, progressive disclosure via folder structure, description-as-trigger pattern, on-demand hooks, data persistence (`${CLAUDE_PLUGIN_DATA}`), and marketplace curation strategy.

Both references are required for structural plugin work. See **Workflow step 1 (Docs)**.

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

### Skill Design Principles

Key principles from Anthropic's internal skill usage (see `docs/reference/` for full guides):

- **Description is a trigger, not a summary** — Claude scans skill descriptions to decide "is there a skill for this request?" Write descriptions for model matching, not human readability.
- **Gotchas are the highest-signal content** — Build a Gotchas section from common Claude failure points. Update it over time as new edge cases surface.
- **Use the folder structure for progressive disclosure** — A skill is a folder, not just a markdown file. Put detailed references in `references/`, templates in `assets/`, helper scripts in `scripts/`. Tell Claude what files exist and it will read them at the right time.
- **Don't state the obvious** — Claude already knows common coding patterns. Focus skill content on information that pushes Claude out of its default behavior.
- **Avoid railroading** — Give Claude flexibility to adapt to the situation. Overly specific instructions make skills brittle across diverse use cases.
- **On-demand hooks** — Skills can register hooks that activate only when the skill is invoked and last for the session. Use for opinionated guards you don't want running all the time (e.g., blocking destructive commands).
- **Composing skills** — Reference other skills by name; the model will invoke them if installed. No formal dependency management needed.
- **Skill categories** (for reference when designing new plugins):
  1. Library & API Reference — how to use internal/external libraries correctly
  2. Product Verification — test/verify code with external tools (playwright, tmux)
  3. Data Fetching & Analysis — connect to data/monitoring stacks
  4. Business Process & Team Automation — automate repetitive workflows
  5. Code Scaffolding & Templates — generate framework boilerplate
  6. Code Quality & Review — enforce quality, review code
  7. CI/CD & Deployment — fetch, push, deploy code
  8. Runbooks — symptom → investigation → structured report
  9. Infrastructure Operations — maintenance with guardrails

### SKILL.md Quick Reference

Frontmatter fields (all optional except body content):

| Field | Description |
|-------|-------------|
| `name` | Skill name (defaults to directory name) |
| `description` | Trigger condition for model matching — NOT a summary. Use "Use when ..." pattern |
| `argument-hint` | Autocomplete hint (e.g., `"[url] [options]"`) |
| `disable-model-invocation` | `true` = user-only invocation (model cannot trigger) |
| `user-invocable` | `false` = hidden from `/` menu (model-only) |
| `allowed-tools` | Restrict available tools (e.g., `Read, Grep, Bash(git *)`) |
| `model` | Model override (e.g., `sonnet`, `haiku`) |
| `context` | `fork` = run in isolated subagent context |
| `agent` | Agent type when `context: fork` (e.g., `Explore`) |
| `hooks` | On-demand hooks active only during skill execution |

String substitutions available in SKILL.md:

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | Full argument string passed to the skill |
| `$ARGUMENTS[N]` / `$N` | Nth argument (0-based) |
| `${CLAUDE_SKILL_DIR}` | Directory containing SKILL.md (not plugin root). Use for referencing bundled scripts/files |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `` !`command` `` | Shell command execution — result injected as preprocessing |

### Hooks Quick Reference

Defined in `hooks/hooks.json`. Events: `SessionStart`, `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`.

Hook types: `command` (shell script), `http` (POST endpoint), `prompt` (LLM evaluation), `agent` (agent verification).

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{ "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/scripts/lint.sh" }]
    }]
  }
}
```

### Workflow

Applies to all plugin work: creation, modification, improvement, and refactoring.

1. **Docs** — Fetch https://code.claude.com/docs/llms.txt, identify relevant pages, and fetch them. Also consult `docs/reference/skill-building-guide.md` (spec) and `docs/reference/skill-lessons-from-anthropic.md` (practical patterns). This step is **mandatory** for: new plugins, new components (skills, agents, hooks, MCP), schema or config changes. May be **skipped** for: minor text edits, bug fixes within existing logic, or changes that don't touch plugin structure.
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

### Plugin Rename Handling

When renaming a plugin (e.g., `extension-wiki` → `agent-extension-wiki`):

1. Update the `name` and `source` fields in `marketplace.json`.
2. Bump the version (at least minor) to signal the change.
3. Update the `description` if scope has changed.

### Release Workflow (Tagging on main)

When the user requests a tag on `main`:

1. **Compare branches** — Run `git log main..develop --oneline` and `git diff main..develop --stat` to list all changes.
2. **Ask about marketplace update** — Show each plugin's current version and what changed since `main`. Ask which plugins should have their version bumped and by how much.
3. **Update on develop** — Update `marketplace.json` for selected plugins. Commit (e.g., `release: bump versions for <tag>`).
4. **Merge to main** — Switch to `main` and merge `develop` (no fast-forward: `git merge --no-ff develop`).
5. **Create tag** — Create the annotated tag on `main` (e.g., `git tag -a v1.5.0 -m "v1.5.0"`).
6. **Switch back** — Return to `develop`.
7. **Confirm push** — Ask the user before pushing `main`, `develop`, and the tag to remote.

## Environment Variables & Data Paths

| Variable | Description |
|----------|-------------|
| `${CLAUDE_PLUGIN_ROOT}` | Plugin install directory (changes on update — do not store data here) |
| `${CLAUDE_PLUGIN_DATA}` | Persistent per-plugin data directory (survives updates) |

| Purpose | Path |
|---------|------|
| Persistent data (reports, config) | `${CLAUDE_PLUGIN_DATA}` (preferred) or `~/.claude-code-zero/<plugin-name>/` (legacy) |
| Temporary data (clone tmp) | `/tmp/<plugin-name>/` |

Data stored in the skill/plugin directory is deleted on upgrade — always use `${CLAUDE_PLUGIN_DATA}` for persistent storage.


## Gotchas

**Component location**: commands/, agents/, skills/, hooks/ go in the **plugin root**, not inside `.claude-plugin/`. Putting them inside `.claude-plugin/` silently fails to load.

**source path**: `marketplace.json` source must start with `./` (relative path). `../` is not supported.

**Version priority**: If both `plugin.json` and `marketplace.json` define `version`, `plugin.json` wins. Set in one place only — this repo uses `marketplace.json` exclusively.

**Hook scripts**: Must have execute permission (`chmod +x`) and a shebang line. Use `${CLAUDE_PLUGIN_ROOT}` for paths.

**Installed plugin isolation**: Installed plugins are cached copies — they cannot reference files outside their own directory.

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
