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

See **Workflow step 1 (Docs)** for when consultation is required.

## Reference Materials

`docs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf` — Anthropic's official guide covering skill fundamentals, YAML frontmatter, progressive disclosure, testing, distribution, and patterns.

`docs/reference/official-plugin-tools.md` — Comparison of Anthropic's official **plugin-dev** (full plugin scaffolding) and **skill-creator** (skill quality measurement/optimization). Use plugin-dev for structure/hooks/MCP/agents, skill-creator for skill testing and description optimization.

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

## Known Claude Code Behaviors

### Skill `allowed-tools` Behavior

See `docs/reference/skill-allowed-tools.md` for full details (tested on v2.1.63).

- Bare names and `Bash(command *)` command-scoped patterns work. `Write(path)` path-scoped does not
- `$()` command substitution triggers a separate security prompt regardless of allowed-tools
- `~/.claude/` hardcoded write protection was not observed in v2.1.63
- Skills **do** inherit parent `settings.json` permissions: `permissions.allow` is additive, `permissions.deny` overrides skill `allowed-tools` (deny > allow). Tested in v2.1.63; [#18950](https://github.com/anthropics/claude-code/issues/18950) may be outdated

### Agent `tools` / `disallowedTools` Behavior

See `docs/reference/agent-tools.md` for full details (tested on v2.1.63).

Agent `tools` is an **availability filter**, NOT an auto-approve list (unlike Skill `allowed-tools`). The `tools` field does NOT create a fresh permission context — safe CWD commands remain AUTO, risky commands (out-of-CWD, `$()`, `git -C`, rm) remain PROMPT.

`permissionMode` controls approval behavior:

| `permissionMode` | Write/Edit | Bash (safe) | `$()` |
|---|---|---|---|
| (default) | PROMPT | AUTO | PROMPT |
| `plan` | PROMPT | AUTO | PROMPT |
| `acceptEdits` | **AUTO** | PROMPT | PROMPT |
| `dontAsk` | AUTO | AUTO | **DENY** |
| `bypassPermissions` | AUTO | AUTO | **AUTO** |

Other findings:
- `disallowedTools: Write, Edit` → inherits parent permissions, specified tools removed entirely
- `tools`/`disallowedTools` 둘 다 없음 → `disallowedTools`와 동일하게 부모 상속
- `dontAsk` + `disallowedTools` → `disallowedTools` 단독과 동일 (전부 AUTO)
- `Write(path)` path-scoped → 인식 안 됨 (bare `Write`로 파싱)
- `git -C` flag (경로 무관, `.` 포함) → 항상 PROMPT

Recommended patterns:
- Fully autonomous: `permissionMode: bypassPermissions` + `tools: Read, Write, Edit, Bash`
- Autonomous read+shell: `permissionMode: dontAsk` + `tools: Read, Bash`
- Auto-accept edits: `permissionMode: acceptEdits` + `tools: Read, Write, Edit, Bash`
- Read-only explorer: `disallowedTools: Write, Edit` (no `tools` field)

### Plugin Data Path Convention

| Purpose | Path |
|---------|------|
| Persistent data (reports, config) | `~/.claude-code-zero/<plugin-name>/` |
| Temporary data (clone tmp) | `/tmp/<plugin-name>/` |

### Plugin Data Access Auto-Approve

Two ways to auto-approve out-of-CWD paths (e.g., `~/.claude-code-zero/`):

- **Bare `allowed-tools`** (`Read, Write, Edit`): Auto-approves all paths. Simplest approach
- **PreToolUse hook**: Selectively auto-approves specific paths only. Use when plugin data paths should be allowed while other out-of-CWD paths remain prompted

`notebooklm-connector` and `plugin-bookmarks` use the PreToolUse hook for scope detection + lazy init (project-level data isolation requires Bash hash computation and atomic initialization that skill instructions alone cannot guarantee). Auto-approve was removed from these hooks — bare `allowed-tools: Read, Write, Edit` in the skills already auto-approves all paths.

### Skill Supporting Files

See `docs/reference/skill-supporting-files.md` for full details.

- Skills reference companion files via markdown links: `[reference.md](reference.md)`
- `${CLAUDE_SKILL_DIR}` resolves to the skill's directory (not plugin root)
- Supporting files are **not auto-loaded** — Claude reads them on demand
- Keep SKILL.md under 500 lines; move large reference material to separate files
- `@filename.md` syntax force-loads and burns context — prefer markdown links

### Sub-agent Output Token Limit

`CLAUDE_CODE_MAX_OUTPUT_TOKENS` defaults to 32,000 tokens (max 64,000). No per-subagent setting in frontmatter. Large HTML report generation may hit this limit.

**Workaround**: Set before launching Claude Code:
```bash
export CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000
```

| Pros | Cons |
|------|------|
| Immediate, no code changes | Main conversation auto-compaction triggers slightly earlier (negligible) |
| Subagents use independent context — no impact | Higher output token cost if usage increases |
| 64K covers most reports | Very large plugins (>64K) still limited |

## Coding Style

- **Language**: All plugin deliverables in English (SKILL.md, agent.md, README.md, comments, descriptions, code). All development conversation (plans, discussions, questions) in Korean.
- **Plugin names**: kebab-case (e.g., `notebook-researcher`, `code-reviewer`)
- **Versioning**: Semantic Versioning (e.g., `1.0.0`). Version is set only in `marketplace.json`, not in individual `plugin.json` files (all plugins use relative-path sources).
- **Descriptions**: Clear and concise
- **Line endings**: Always Unix LF (`\n`), never Windows CRLF (`\r\n`). CRLF in shell scripts causes `command\r: not found` errors (e.g., `set -o pipefail\r`). When creating or editing any file — especially `.sh`, `.json`, `.md` — ensure LF-only line endings. If in doubt, verify with `file <path>` or `cat -A <path>` (CRLF shows as `^M$`).
