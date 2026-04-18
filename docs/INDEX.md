# docs/ — Knowledge Base Index

> System of record for this repository. `CLAUDE.md` and `AGENTS.md` are maps; detailed knowledge lives here.
>
> When adding new content: pick the right bucket (reference / operations / design / research / handoff), register it in this index, and cross-link from `AGENTS.md` only if agents need to find it without a map.

## Reference — Specs, Guides, Traps

Required reading for structural plugin work.

| Document | Description |
|---|---|
| `reference/skill-building-guide.md` | Skill design spec: frontmatter, description formula, 5 design patterns |
| `reference/skill-lessons-from-anthropic.md` | Practical guide: 9 categories, gotchas-driven design, progressive disclosure |
| `reference/gotchas.md` | Non-obvious failure modes — loading, versioning, silent ignores, data, research |

For marketplace schema, hooks, SKILL.md frontmatter, and environment variables, fetch the official docs directly (`https://code.claude.com/docs/en/<page>`) — see CLAUDE.md for the entry point.

## Operations

| Document | Description |
|---|---|
| `release-workflow.md` | 8-step release process: sync → compare → bump → merge → tag → push |
| `plugin-marketplaces.md` | Marketplace documentation and distribution notes |

## Design & Planning

Plans are first-class artifacts — active and completed alike are committed here so agents can pick up work without external context.

| Directory | Description |
|---|---|
| `superpowers/plans/` | Plugin implementation plans (date-prefixed, e.g. `2026-04-14-worktree-plus-safe-removal.md`) |
| `superpowers/specs/` | Design specs and analysis documents |

Empty placeholders (reserved, currently unused): `enhancement/`, `plan/`.

## Research

| Document | Description |
|---|---|
| `research/ai-context-tools-comparison.md` | Graphify, CodeSight, code-review-graph, Repomix 비교 분석 |
| `research/deeptutor-analysis.md` | DeepTutor 분석 |
| `research/token-efficiency-tools-comparison.md` | caveman, claude-token-efficient, rtk 토큰 효율 도구 비교 — 공격 지점/메커니즘/조합 |
| `research/career-ops-analysis.md` | career-ops 레퍼런스 레포 분석 — 목적, 핵심 기능, 인터뷰 준비, 맞춤 CV/PDF 생성 흐름 |

## Session Handoff

Conversation handoff notes, organized by initiative.

| Directory | Description |
|---|---|
| `handoff/harness-zero/` | harness-zero plugin handoffs |
| `handoff/vision-powers/` | vision-powers plugin handoffs |
| `handoff/new-vibe/` | vibeproxy-kit / new-vibe handoffs |

## External Knowledge Sources

| Directory | Description |
|---|---|
| `origin/` | External articles and guides (Anthropic, OpenAI, Codex blog, skill PDFs). **Local only — gitignored.** Do not treat as authoritative repository state. |
