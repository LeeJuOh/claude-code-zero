# AGENTS.md

> Source of truth for this repository. CLAUDE.md imports this file; GEMINI.md and other agent entry points should do the same.
>
> This file is a **map**, not an encyclopedia. Detailed knowledge lives in `docs/` — see `docs/INDEX.md`. Non-obvious traps live in `docs/reference/gotchas.md`.

## Repository Overview

Personal marketplace for Claude Code plugins. Plugins are developed under `plugins/` and released through `.claude-plugin/marketplace.json`.

- Release-ready plugins: `notebooklm-connector`, `toolbox`, `vibeproxy-kit`, `vision-powers`, `worktree-plus`, `skill-creator-pro`, `codex-advisor`, `rubber-duck-tutor`
- Lab plugins (prefix `lab-` or `category: lab`): `e2e-test-runner`, `claw-mo`, `claw-mux`, `lab-harness-zero` (external repo)

## Directory Structure

```
.claude-plugin/marketplace.json   # Plugin registry (versions + sources)
plugins/<plugin-name>/            # Local plugin source (git-committed)
docs/                             # Knowledge base — see docs/INDEX.md
data/                             # Session and operational data
video/                            # Demo videos and media assets (gitignored)
references/                       # External reference repos (gitignored)
```

## Knowledge Map

Everything detailed is in `docs/`. Direct entry points:

| Topic | Pointer |
|---|---|
| Full knowledge index | `docs/INDEX.md` |
| Known traps and silent failures | `docs/reference/gotchas.md` |
| Skill design spec | `docs/reference/skill-building-guide.md` |
| Skill practical guide | `docs/reference/skill-lessons-from-anthropic.md` |
| Release process (8 steps) | `docs/release-workflow.md` |
| Active plans & specs | `docs/superpowers/plans/`, `docs/superpowers/specs/` |
| Marketplace schema, hooks, SKILL.md format, env vars | Official docs — see below |

## Official Claude Code Docs

Always start with `https://code.claude.com/docs/llms.txt` — the full index of every Claude Code docs page. Fetch specific pages as `https://code.claude.com/docs/en/<page>`. Don't rely on memory or plan-internal citations; the index is the only authoritative source.

**Mandatory fetch when:**
- Creating new plugins, components (skills/agents/hooks/MCP), or schema changes
- Reviewing specs or issues (`docs/specs/*.md`, `docs/issues/*.md`) that cite official docs — verify each cited number against source. Doc-internal tables may contain invented or outdated values.

Skip only for minor text edits or bug fixes inside existing logic.

**Common starting pages (not exhaustive):** `plugins.md`, `plugins-reference.md`, `plugin-marketplaces.md`, `hooks.md`, `hooks-guide.md`, `skills.md`, `sub-agents.md`, `memory.md`, `env-vars.md`, `context-window.md`, `costs.md`, `how-claude-code-works.md`, `settings.md`.

**Other agents' docs:** For Codex (OpenAI): `https://learn.chatgpt.com/docs/llms.txt`.

## Plugin Development

Plugin creation and iteration is handled by the **skill-creator-pro** plugin — invoke `/skill-creator-pro` for all plugin development work.

### Plugin Component Structure

Standard layout inside `plugins/<plugin-name>/`:

```
.claude-plugin/plugin.json   # Plugin manifest
commands/                     # Slash commands (legacy; prefer skills/)
skills/                       # Skills with SKILL.md
agents/                       # Sub-agents (*.md)
hooks/                        # Hooks (hooks.json + scripts)
.mcp.json                    # MCP server config (optional)
.lsp.json                    # LSP server config (optional)
settings.json                # Only { "agent": "name" } is honored
```

Components (`commands/`, `skills/`, `agents/`, `hooks/`) live at the **plugin root**, not inside `.claude-plugin/`. See `docs/reference/gotchas.md` for the silent-fail modes.

### Workflow (creation, modification, refactoring)

1. **Docs** — For new plugins or structural changes, consult `docs/reference/` and official docs (`https://code.claude.com/docs/llms.txt`).
2. **Analysis** — User provides the goal and specific reference files. Read **only** those files.
3. **Implementation** — Create or modify files under `plugins/`. Never modify files in `references/`.
4. **Documentation** — If plugin behavior changed, update `README.md`. Also update the `description` in **both** `plugin.json` and `marketplace.json` — removed features must be removed from descriptions too.
5. **Registration** — Add new plugins to `.claude-plugin/marketplace.json`.
6. **Validation** — Run `unset CLAUDECODE && claude plugin validate .` (unset avoids nested-session errors).

### Local Testing

```bash
claude --plugin-dir ./plugins/<plugin-name>
```

If the same plugin is installed from the marketplace, both versions load and the cached copy may win. Disable the marketplace version before testing:

```bash
claude plugin disable <plugin-name>@claude-code-zero
claude plugin enable  <plugin-name>@claude-code-zero
```

## references/ Folder

Git-ignored. External open-source code for local reference only. Clone research repos into `references/<repo-name>`. **Never modify** — read, benchmark, and mine for patterns only.

## Git Workflow

### Branching

- **`develop`** — Working branch. All development happens here.
- **`main`** — Release branch. Only updated via `--no-ff` merges from `develop`. Never commit directly.

### Commits

- English only, 1–2 concise sentences focused on the core change.
- No `Co-Authored-By` trailers.
- No auto-push — push only when the user explicitly requests it.

### Tagging & Versioning

- Tags on `main` only. Never tag on `develop`.
- Tag format: `v<major>.<minor>.<patch>`.
- Plugin versions in `marketplace.json` follow SemVer: patch = fixes/tweaks, minor = features/renames, major = breaking interface changes.
- Pre-flight: `git fetch origin`, check `git tag --sort=-v:refname | head -3`, and run `git log develop..main --oneline` — if commits exist on main, merge main → develop first.

Full 8-step release process: `docs/release-workflow.md`.

## Plugin Data Paths

| Variable | Description |
|---|---|
| `${CLAUDE_PLUGIN_ROOT}` | Install directory — **wiped on update**, never store data here |
| `${CLAUDE_PLUGIN_DATA}` | Persistent per-plugin data directory — survives updates |

For the full env-var list, fetch `https://code.claude.com/docs/en/env-vars.md`.

## Coding Style

- **Language** — All plugin deliverables in English (SKILL.md, agent.md, README.md, comments, descriptions, code). Development conversation (plans, discussions, questions) in Korean.
- **Plugin names** — kebab-case (`notebook-researcher`, `code-reviewer`). Experimental plugins use `lab-` prefix.
- **Versioning** — Local (`./` source) plugins: version in `marketplace.json` only. External (GitHub source) plugins: version in `plugin.json` only.
- **Descriptions** — Clear, concise, reflect actual capabilities.
- **Line endings** — Unix LF only. CRLF in shell scripts causes `command\r: not found` errors (e.g., `set -o pipefail\r`). Applies to `.sh`, `.json`, `.md`.

## Plugin README Style

READMEs are written from the **user's perspective**:

1. **Why you need it** — the pain of not having the plugin, first.
2. **Quick Start** — 2–3 lines to get running.
3. **Commands** — reference table.
4. **Configuration** — config file structure, if relevant.

Avoid: implementation-detail sections (`git rev-parse`, hash algorithms) and bullet-list-only Features sections.
