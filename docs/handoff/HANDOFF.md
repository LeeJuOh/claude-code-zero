# Handoff: Plugin Token Optimization

## Goal

Reduce plugin token footprint (Skills + Agents description) in Claude Code context window while maintaining triggering accuracy and functional performance. Three optimization axes:

- **Axis 1** ✅: Remove `<example>` blocks from agent frontmatter descriptions
- **Axis 2** ✅: Compress verbose skill descriptions (keep trigger accuracy)
- **Axis 3** 🔲: Add `disable-model-invocation: true` to manual-only skills (per-plugin analysis)

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

### Axis 3 — disable-model-invocation (PENDING)
Candidates identified but requires user confirmation per-skill:

| Skill | Plugin | Tokens | Rationale |
|-------|--------|--------|-----------|
| setup-aliases | vibeproxy-kit | 107 | Initial setup only |
| codex-setup | codex-advisor | 65 | Initial setup/troubleshooting |
| worktree-config | worktree-plus | 58 | Config change only |
| claw-mo-setup | claw-mo | 54 | Initial mo setup |
| claw-mo-down | claw-mo | 44 | Explicit stop command |
| sync-references | toolbox | 38 | Explicit pull command |

User instruction: "플러그인 하나씩 분석하면서 진행하자" — analyze per-plugin, ask user for each.

## What Worked

- Parallel agent execution for bulk edits (4 agents × multiple files = fast)
- Official docs fetch confirmed exact behavior of `disable-model-invocation: true`
- Compression pattern: "WHAT (1 sentence) + WHEN (trigger conditions)" — no verbose lists
- Keeping Korean trigger phrases (user actually uses Korean)
- Removing "Do NOT use for" where skill name already disambiguates

## What Didn't Work

- N/A — axis 1+2 execution was clean

## Next Steps

1. Axis 3: Walk through each plugin's skills with user, apply `disable-model-invocation: true` where confirmed
2. Validate all edits: `unset CLAUDECODE && claude plugin validate .` for each modified plugin
3. Test triggering: verify compressed descriptions still trigger correctly on real queries
4. Measure: compare before/after token counts in `/context` output (need fresh session in harness-zero)
5. Version bump for modified plugins in `marketplace.json`
6. Commit all changes to develop branch
