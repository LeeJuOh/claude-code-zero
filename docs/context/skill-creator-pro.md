# skill-creator-pro

skill-creator-pro v2 re-baselines the plugin on Anthropic's official skill-creator — lean, flexible,
warm — restores its eval harness to official as well, and grafts on only distilled ideas that change
the author's judgment, undoing the bloat and drift v1.8.2 had accumulated ([[0001]]).

## Language

**Official base**:
Anthropic's official `skill-creator` — a single 485-line SKILL.md plus `schemas.md` and three
agents, with a flexible coaching loop and a warm "explain the why", anti-railroading tone. The spine
skill-creator-pro restores.

**Drift**:
The gap v1.8.2 opened from the official base: a rigid 5-phase pipeline, three classification
rituals (label-pinning that doesn't change what gets built — 9 categories,
capability-uplift/encoded-preference, problem-first/tool-first), ~1685 lines of reference files,
and an 18-item quality gate. The thing being undone.

**Eval harness**:
The eval scripts, the grader, comparator, and analyzer agents, and the eval viewer that run, grade,
and review skill evals. Derived from the official skill-creator, not from autoresearch, then forked
wholesale without documentation — drift, so it is restored to official ([[0001]]).

**Trigger eval limit**:
The mismatch between the single-turn trigger eval behind description optimization and skills that
auto-detect a situation mid-conversation, for which it is a poor fit (found on rubber-duck-tutor).

**autoresearch / auto-optimize**:
The `auto-optimize` sub-skill, adapted from Andrej Karpathy's autoresearch methodology — pro's
genuine net-new addition, a separate skill outside the main skill's drift and untouched by the
re-baseline.

**Distill-not-dump**:
The graft rule: source docs enter the lean SKILL.md as thin inline principles, never as 300–600-line
reference files. Dumping them rebuilds the exact bloat being removed.

**Source docs**:
The three documents the graft drew on: two skill-authoring guides, `skill-building-guide.md` and
`skill-lessons-from-anthropic.md` (source of the 9 categories), each ~95% already in official spirit
so only their gaps were distilled (both deleted 2026-09-24 as conflicting with official docs; in git
history), and `cc-large-codebases.md` from the harness-zero wiki, ~0% absorbed and the headline
net-new material.

**Harness-fit philosophy**:
The cc-large-codebases idea that a skill is one of five harness extension points, kept only as three
inline one-liners that change a skill creator's judgment: the "right primitive?" gate at intent
capture (a skill, or CLAUDE.md, a hook, an MCP?), the skill-rot retirement review on model updates
(reframing v1's narrow "Model Update Check"), and the note that a hook can propose improvements back
to a skill, not just block. The rest of cc-large — agentic-search depth, LSP/codemap setup,
brain/hands subagents, org ownership (DRI, regulated industries) — is about operating Claude Code at
scale, so it belongs in repo docs and CLAUDE.md/AGENTS.md, not a skill-creation tool.

**Survival rule**:
The anti-slippery-slope test for cc-large ideas: one lives, as a one-liner, only if it changes the
author's judgment at the gate — awareness yes, operational depth no.
