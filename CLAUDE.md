# CLAUDE.md

> Navigation map. Detailed references live in `docs/`.
> Gotchas and Coding Style are inline — highest-signal content stays in the map.

## Repository Overview

Personal marketplace for Claude Code plugins. Plugins are developed under `plugins/` and deployments are managed through `marketplace.json`.

## Directory Structure

```
.claude-plugin/marketplace.json   # Marketplace definition (plugin registry)
plugins/<plugin-name>/            # Local plugin source code (git-committed)
# External repo plugins registered via GitHub source object in marketplace.json
# Lab/beta plugins use `lab-` name prefix (e.g., lab-harness-zero)
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

### Codex (OpenAI) Documentation

When working on Codex-related tasks (cross-platform compatibility, AGENTS.md for Codex, Codex tool mappings), consult https://developers.openai.com/llms.txt for up-to-date Codex documentation.

## Reference Materials

Key references for structural plugin work:

- `docs/reference/skill-building-guide.md` — Skill design spec (frontmatter, description formula, 5 design patterns)
- `docs/reference/skill-lessons-from-anthropic.md` — Practical guide (9 categories, gotchas-driven design, progressive disclosure)

Both are required reading for new plugins and structural changes. See **Workflow step 1 (Docs)**.

## Marketplace Management

### marketplace.json Schema

Location: `.claude-plugin/marketplace.json`

**Top-level fields:**

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Marketplace identifier (kebab-case) |
| `owner` | Yes | `{ "name": "...", "email": "..." }` |
| `plugins` | Yes | Array of plugin entries |
| `metadata.description` | No | Marketplace description |
| `metadata.pluginRoot` | No | Base path prepended to relative plugin sources |

**Plugin entry fields:**

| Field | Required | Description |
|---|---|---|
| `name` | Yes | kebab-case identifier |
| `source` | Yes | `"./path"` (local) or source object (external) |
| `version` | No | SemVer — set here for local, in plugin.json for external |
| `description` | No | One-line summary |
| `category` | No | e.g., `"lab"` for experimental plugins |
| `tags` | No | Array of keyword strings |

**Source types:**

- **Local**: `"./plugins/foo"` — must start with `./`, no `../`
- **GitHub**: `{"source": "github", "repo": "owner/repo", "ref": "branch", "sha": "..."}`
- **Git URL**: `{"source": "url", "url": "https://...", "ref": "...", "sha": "..."}`
- **Git subdirectory**: `{"source": "git-subdir", "url": "...", "path": "subdir/path"}`
- **npm**: `{"source": "npm", "package": "...", "version": "...", "registry": "..."}`

### Plugin Development

Plugin creation (skills, hooks, agents, SKILL.md, evals) is handled by the **skill-creator-pro** plugin. Invoke `/skill-creator-pro` for all plugin development work.

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
- When cloning external repos for research, always clone into `references/<repo-name>`.
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

See `docs/release-workflow.md` — 8-step process: sync remote → compare branches → bump versions → merge to main → tag → push.

**Release pre-flight**: Always `git fetch origin` and check `git tag --sort=-v:refname | head -3` before starting the release workflow. Other sessions may have tagged versions in the meantime — skipping this causes tag collisions and push failures.

## Gotchas

**Component location**: commands/, agents/, skills/, hooks/ go in the **plugin root**, not inside `.claude-plugin/`. Putting them inside `.claude-plugin/` silently fails to load.

**source path**: `marketplace.json` source must start with `./` (local) or be a source object (external). `../` is not supported.

**Version priority**: If both `plugin.json` and `marketplace.json` define `version`, `plugin.json` wins silently. Local plugins: set version in `marketplace.json` only. External repo plugins: set version in `plugin.json` only.

**Version bump required**: Changing plugin code without bumping version means existing users won't see the update — cached copies persist until version changes.

**Plugin name format**: Names must be kebab-case only (lowercase, digits, hyphens). Spaces or brackets like `[Lab] my-plugin` fail validation. Use `lab-` prefix for experimental plugins.

**Plugin data persistence**: Data in the plugin directory is deleted on upgrade — always use `${CLAUDE_PLUGIN_DATA}` for persistent storage. See `docs/reference/env-and-data-paths.md`.

**Installed plugin isolation**: Installed plugins are cached copies — they cannot reference files outside their own directory.

**Plugin agent security**: Plugin agents (`agents/*.md`) silently ignore `permissionMode`, `hooks`, and `mcpServers` frontmatter. Supported: `tools`, `disallowedTools`, `model`, `maxTurns`, `skills`, `memory`, `background`, `isolation`.

**Plugin settings.json**: Only the `agent` field is supported. `permissions`, `hooks`, and other settings are silently ignored.

**Eval artifacts**: Results go in `plugins/<plugin-name>/.evals/` (gitignored). Never place eval artifacts in the plugin root — they get distributed with marketplace installs.

**Research double-check**: Always verify web search / LLM research results against actual code and READMEs in `references/` before writing into spec or design documents. Research outputs can fabricate product features entirely (confirmed: HarnessKit features were completely mischaracterized).

**Skill allowed-tools**: Bare names and `Bash(command *)` command-scoped patterns work. `Write(path)` path-scoped does not. `$()` command substitution triggers a separate security prompt regardless of allowed-tools.

## Coding Style

- **Language**: All plugin deliverables in English (SKILL.md, agent.md, README.md, comments, descriptions, code). All development conversation (plans, discussions, questions) in Korean.
- **Plugin names**: kebab-case (e.g., `notebook-researcher`, `code-reviewer`)
- **Versioning**: Semantic Versioning (e.g., `1.0.0`). Local plugins (`./` source): version in `marketplace.json` only. External repo plugins (GitHub source): version in `plugin.json` only.
- **Descriptions**: Clear and concise
- **Line endings**: Always Unix LF (`\n`), never Windows CRLF (`\r\n`). CRLF in shell scripts causes `command\r: not found` errors (e.g., `set -o pipefail\r`). When creating or editing any file — especially `.sh`, `.json`, `.md` — ensure LF-only line endings. If in doubt, verify with `file <path>` or `cat -A <path>` (CRLF shows as `^M$`).

## Plugin README Style

README는 **사용자 관점**으로 작성:
1. **왜 필요한지** — 이 플러그인 없이 직접 할 때의 불편함을 먼저 설명
2. **Quick Start** — 최소 단계로 시작하는 방법 (2-3줄)
3. **Commands** — 커맨드 레퍼런스 테이블
4. **Configuration** — 설정 파일 구조 (필요 시)

금지: 구현 디테일 섹션 (`git rev-parse`, hash 알고리즘 등), 기능 bullet 나열만으로 구성된 Features 섹션
