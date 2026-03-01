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

## Known Claude Code Permission Issues

`~/.claude/` 하위 경로는 plugin `allowed-tools`로 권한을 부여할 수 없다. 플러그인 데이터 경로로 사용 금지.

- **Write/Edit to `~/.claude/`**: Hardcoded 보호로 `allowed-tools`, `settings.json` 모두 무시됨 ([#21242](https://github.com/anthropics/claude-code/issues/21242))
- **Skill `allowed-tools` → Bash**: 스킬의 `allowed-tools`에 Bash 패턴이 있어도 실제로 권한이 부여되지 않음 ([#14956](https://github.com/anthropics/claude-code/issues/14956))
- **`allowed-tools` YAML list 미지원**: YAML 배열 형식(`- Read`, `- Write(...)`)은 파서가 인식하지 못함. 반드시 comma-separated 문자열 사용: `allowed-tools: Read, Write(...), Edit(...)`
- **Skill `allowed-tools`는 working directory 밖 파일 접근 프롬프트를 override하지 못함**: `allowed-tools: Read`를 선언해도 `~/.claude-code-zero/` 등 working directory 밖 파일은 여전히 프롬프트 발생. 이는 별도 보안 레이어임 ([#11088](https://github.com/anthropics/claude-code/issues/11088), [#18950](https://github.com/anthropics/claude-code/issues/18950))
- **Skill `allowed-tools`에서 path-scoped 패턴 미지원**: `Write(~/.claude-code-zero/...)` 형태는 skill 파서가 인식하지 못하고 전체 `allowed-tools` 파싱을 실패시킴. bare tool name만 사용할 것 ([#11088](https://github.com/anthropics/claude-code/issues/11088))
- **Skills/subagents가 `settings.json`의 `permissions.allow` 상속 안 함** ([#18950](https://github.com/anthropics/claude-code/issues/18950), [#10906](https://github.com/anthropics/claude-code/issues/10906))

### Plugin Data Path Convention

플러그인 데이터는 `~/.claude/` 대신 `~/.claude-code-zero/<plugin-name>/` 에 저장한다.

| 용도 | 경로 |
|------|------|
| 영구 데이터 (reports, config) | `~/.claude-code-zero/<plugin-name>/` |
| 임시 데이터 (clone tmp) | `/tmp/<plugin-name>/` |

### Plugin Data Access Auto-Approve Pattern

Working directory 밖 데이터 파일(`~/.claude-code-zero/`)에 대한 Read/Write/Edit 프롬프트를 없애려면 **PreToolUse hook**을 사용한다. `allowed-tools`나 `settings.json`으로는 해결 불가.

```json
// hooks.json
{
  "matcher": "Read|Write|Edit",
  "hooks": [{
    "type": "command",
    "command": "${CLAUDE_PLUGIN_ROOT}/hooks/approve-data-access.sh"
  }]
}
```

```bash
# approve-data-access.sh
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
FILE_PATH="${FILE_PATH/#\~/$HOME}"
case "$FILE_PATH" in
  "$HOME/.claude-code-zero/<plugin-name>/data"/*)
    echo '{"decision": "approve"}' ;;
esac
exit 0
```

**주의**: subagent에서의 auto-approve 동작은 미확인 (스킬 직접 호출만 테스트됨).

## Coding Style

- **Language**: All plugin deliverables in English (SKILL.md, agent.md, README.md, comments, descriptions, code). All development conversation (plans, discussions, questions) in Korean.
- **Plugin names**: kebab-case (e.g., `notebook-researcher`, `code-reviewer`)
- **Versioning**: Semantic Versioning (e.g., `1.0.0`). Version is set only in `marketplace.json`, not in individual `plugin.json` files (all plugins use relative-path sources).
- **Descriptions**: Clear and concise
