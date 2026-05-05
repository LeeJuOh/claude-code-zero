# Handoff: Plugin Token Optimization

## Goal

Reduce plugin token footprint (Skills + Agents description) in Claude Code context window while maintaining triggering accuracy and functional performance. Three optimization axes:

- **Axis 1** ✅: Remove `<example>` blocks from agent frontmatter descriptions
- **Axis 2** ✅: Compress verbose skill descriptions (keep trigger accuracy)
- **Axis 3** ✅: Add `disable-model-invocation: true` to manual-only skills (13 skills across 6 plugins)

## First Action

Pick up axis 3 — analyze each plugin's skills one by one to determine which should get `disable-model-invocation: true`. Start with `vibeproxy-kit/setup-aliases` (107 tok, highest savings). Ask the user: "이 스킬 자동 트리거 필요해? 항상 /setup-aliases로 수동 호출?" — then apply or skip based on answer.

## Context

The user noticed their installed plugins consume ~7k tokens (5.7k skills + 1.3k agents) in every turn's context window. We researched the official docs and found:

1. `description` field is always loaded into context (per-skill cap 1,536 chars)
2. `disable-model-invocation: true` removes description from context entirely (0 tokens)
3. Global skill description budget = 1% of context window (~2,000 chars for 200k model)
4. More skills = more aggressive truncation of each description

The user's design principle: "기능 및 성능은 그대로인데 토큰 효율화" — no performance degradation allowed.

## Current Progress

### Axis 1 — Agent example removal (DONE)
Removed `<example>` blocks from 5 agent descriptions:
- `notebooklm-connector:chrome-mcp-query` (250 → ~80 tok)
- `vision-powers:visual-report-writer` (178 → ~60 tok)
- `vision-powers:coherence-reviewer` (177 → ~55 tok)
- `vision-powers:security-auditor` (156 → ~50 tok)
- `vision-powers:feature-architect` (151 → ~50 tok)

### Axis 2 — Skill description compression (DONE)
Compressed descriptions for 24 skills across 7 plugins:
- **vision-powers**: context-health-visual, diff-visual, doc-visual, fact-check, plugin-visual, report-manager
- **rubber-duck-tutor**: duck, duck-verify, duck-design, duck-orient, duck-plan, duck-review
- **codex-advisor**: all 9 skills (adversarial, cancel, rescue, research, result, review, setup, status, verify)
- **notebooklm-connector**: notebooklm-manager
- **skill-creator-pro**: skill-creator-pro, auto-optimize
- **vibeproxy-kit**: setup-aliases
- **claw-mux**: claw-mux
- **claw-mo**: claw-mo-manage
- **toolbox**: gemini-fetch

### Axis 3 — disable-model-invocation (DONE)
Applied `disable-model-invocation: true` to 13 skills across 6 plugins:

| Skill | Plugin | Rationale |
|-------|--------|-----------|
| setup-aliases | vibeproxy-kit | Initial setup only |
| worktree-config | worktree-plus | Config change only |
| claw-mo-setup | claw-mo | Initial mo setup |
| claw-mo-down | claw-mo | Explicit stop command |
| sync-references | toolbox | Explicit pull command |
| context-health-visual | vision-powers | Heavy report — intentional invocation |
| diff-visual | vision-powers | Heavy report — intentional invocation |
| doc-visual | vision-powers | Heavy report — intentional invocation |
| fact-check | vision-powers | Heavy report — intentional invocation |
| plugin-visual | vision-powers | Heavy report — intentional invocation |
| duck-verify | rubber-duck-tutor | Specific mode — routed via /duck |
| duck-orient | rubber-duck-tutor | Specific mode — routed via /duck |
| duck-plan | rubber-duck-tutor | Specific mode — routed via /duck |
| duck-review | rubber-duck-tutor | Specific mode — routed via /duck |

Skipped (auto-trigger needed):
- `codex-setup` — "모델 바꿔" natural language trigger
- `report-manager` — "리포트 열어" natural language trigger
- `duck` — entry point for all duck modes
- `duck-design` — auto-detects pre-implementation intent
- All codex-advisor skills (except setup) — independent natural language triggers
- All claw-mux, skill-creator-pro, notebooklm-connector skills

## What Worked

- Parallel agent execution for bulk edits (4 agents × multiple files = fast)
- Official docs fetch confirmed exact behavior of `disable-model-invocation: true`
- Compression pattern: "WHAT (1 sentence) + WHEN (trigger conditions)" — no verbose lists
- Keeping Korean trigger phrases (user actually uses Korean)
- Removing "Do NOT use for" where skill name already disambiguates

## What Didn't Work

- N/A — axis 1+2 execution was clean

## Next Steps

1. ~~Axis 3: Walk through each plugin's skills with user~~ ✅
2. ~~Validate all edits~~ ✅ (all 6 plugins pass)
3. Test triggering: verify slash commands still work for disabled skills
4. Measure: compare before/after token counts in `/context` output (fresh session)
5. ~~Version bump~~ ✅
6. Commit all changes to develop branch
