# CLAUDE.md

> Thin index for Claude Code. Source of truth is `AGENTS.md`; deep knowledge lives in `docs/`.
>
> If you're looking for a specific rule, workflow, or gotcha — don't search this file. Follow the map.

## Map

- `@AGENTS.md` — repository conventions, workflow, coding style (imported below)
- `docs/INDEX.md` — full knowledge-base index (references, plans, specs, research, gotchas)
- `docs/reference/gotchas.md` — non-obvious failure modes; read before any structural plugin change
- `docs/release-workflow.md` — 8-step release process

@AGENTS.md

## Official Documentation

Entry point: https://code.claude.com/docs/llms.txt — fetch individual pages as `https://code.claude.com/docs/en/<page>`.

Key pages: `plugins.md`, `plugins-reference.md`, `plugin-marketplaces.md`, `discover-plugins.md`, `hooks.md`, `hooks-guide.md`, `skills.md`, `sub-agents.md`, `features-overview.md`, `memory.md`, `env-vars.md`.

For new plugins, new components (skills, agents, hooks, MCP), or schema changes: fetching the relevant page is **mandatory**. Skip only for minor text edits or bug fixes inside existing logic.

### Codex (OpenAI)

For Codex-related tasks (cross-platform compatibility, AGENTS.md for Codex, tool mappings), consult https://developers.openai.com/llms.txt.
