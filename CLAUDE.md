# CLAUDE.md

> Navigation map for Claude Code. Shared knowledge in `@AGENTS.md`, detailed references in `docs/`.

@AGENTS.md

## Official Documentation

Entry point: https://code.claude.com/docs/llms.txt → fetch individual pages as `https://code.claude.com/docs/en/<page>`

Key pages: plugins.md, plugins-reference.md, plugin-marketplaces.md, discover-plugins.md, hooks.md, hooks-guide.md, skills.md, sub-agents.md, features-overview.md, memory.md, env-vars.md

For new plugins, new components (skills, agents, hooks, MCP), or schema changes: fetching docs is **mandatory**. May be skipped for minor text edits or bug fixes within existing logic.

### Codex (OpenAI) Documentation

When working on Codex-related tasks (cross-platform compatibility, AGENTS.md for Codex, Codex tool mappings), consult https://developers.openai.com/llms.txt for up-to-date Codex documentation.

## Marketplace Schema

Full schema: `docs/reference/marketplace-schema.md` (top-level fields, plugin entry fields, source types).

Plugin creation handled by **skill-creator-pro** plugin. Invoke `/skill-creator-pro` for all plugin development work.

### Local Testing

```bash
claude --plugin-dir ./plugins/<plugin-name>
```

**Marketplace conflict**: `--plugin-dir` loads from the local directory, but if the same plugin is also installed from the marketplace, both versions load simultaneously and the cached (marketplace) version may take precedence. Disable the marketplace version before local testing:

```bash
claude plugin disable <plugin-name>@claude-code-zero   # before testing
claude plugin enable  <plugin-name>@claude-code-zero   # after testing
```

## Release Workflow

See `docs/release-workflow.md` — 8-step process: sync remote → compare branches → bump versions → merge to main → tag → push.

**Release pre-flight**: Always `git fetch origin` and check `git tag --sort=-v:refname | head -3` before starting. Other sessions may have tagged versions in the meantime — skipping this causes tag collisions and push failures.

## Plugin README Style

README는 **사용자 관점**으로 작성:
1. **왜 필요한지** — 이 플러그인 없이 직접 할 때의 불편함을 먼저 설명
2. **Quick Start** — 최소 단계로 시작하는 방법 (2-3줄)
3. **Commands** — 커맨드 레퍼런스 테이블
4. **Configuration** — 설정 파일 구조 (필요 시)

금지: 구현 디테일 섹션 (`git rev-parse`, hash 알고리즘 등), 기능 bullet 나열만으로 구성된 Features 섹션
