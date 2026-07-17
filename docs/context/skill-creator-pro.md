# CONTEXT — skill-creator-pro redesign

> Ubiquitous language and locked decisions for the v2 redesign of `skill-creator-pro`.
> Glossary only — no implementation. Updated inline during the grill session (2026-06-03).

## Goal (one sentence)

Re-baseline `skill-creator-pro` on the **official** Anthropic skill-creator (lean, flexible, warm), keep the eval harness, and graft only **distilled** good ideas — undoing the bloat/drift the current v1.8.2 accumulated.

## Glossary

- **Official base** — Anthropic's `skill-creator` SKILL.md at `references/claude-plugins-official/plugins/skill-creator/skills/skill-creator/`. 485 lines, single SKILL.md + `schemas.md` + 3 agents. Flexible coaching loop, "explain the why", anti-railroading tone. This is the **spine** we restore.
- **Drift** — the gap the current v1.8.2 opened from the official base: rigid 5-Phase pipeline, 3 forced classification steps (9 categories, capability-uplift/encoded-preference, problem-first/tool-first), ~1685 lines of reference files, 18-item quality gate. The thing being undone.
- **eval harness** — the scripts (`run_eval`, `aggregate_benchmark`, `improve_description`, `run_loop`, `package_skill`, `quick_validate`, `generate_report`, `utils`) + agents (`grader`, `comparator`, `analyzer`) + `eval-viewer`. **Provenance: derived from official skill-creator, NOT autoresearch.** But *entirely* forked — every component (8 scripts, 3 agents, `eval-viewer/`, `assets/eval_review.html`, `schemas.md`) differs from official (e.g. `generate_report.py` 153 vs official 326 lines). None of the changes is a targeted philosophy and none is documented → governing rule treats them as drift. **DECISION: restore the whole harness to official** as part of v2 (replace each component with the official version; actual file swap at build time).
- **autoresearch / auto-optimize** — the `auto-optimize` sub-skill, adapted from Andrej Karpathy's autoresearch methodology (refs: `references/autoresearch`, `references/andrej-karpathy-skills`). Pro's genuine net-new addition; a separate skill, not part of the main-skill drift. Out of scope for this redesign unless stated otherwise.
- **Distill-not-dump** — graft rule. The 3 source docs enter as thin inline principles in the lean SKILL.md, NOT as 300–600 line reference files. Dumping them rebuilds the exact bloat being removed. (Aligns with the `plugin-scope-boundaries` memory: only plugin-scope knowledge, never whole docs.)
- **The 3 source docs** —
  - `docs/reference/skill-building-guide.md` — ~95% already in official spirit → distill only the gaps.
  - `docs/reference/skill-lessons-from-anthropic.md` — ~95% already in official spirit → distill only the gaps. (Source of the 9 categories.)
  - `harness-zero/wiki/summaries/cc-large-codebases.md` — ~0% absorbed → the **headline net-new** material (harness-as-extension-points philosophy).
- **Harness-fit philosophy** — from cc-large-codebases. cc-large is about *operating CC at scale*, not *authoring a skill*. Dual filter applied (not-in-official→cut unless earns; AND must improve a skill-CREATOR specifically). Survivors, all inline, no new file:
  1. **"Right primitive?" gate** — at intent capture, ask: is a skill the right tool, or does this belong in CLAUDE.md / a hook / an MCP? Names the 5 extension points as a *decision*, not a lecture. This is how harness awareness reaches the user — at the moment it changes the decision.
  2. **Skill rot / retirement review** — models evolve; a skill built to patch a model limitation becomes overhead once the limitation is gone. Be willing to retire/trim on model updates. (Reframes pro's narrow "Model Update Check".)
  3. **Hooks = self-improvement, not just blocking** — folded into the gate as ONE line: a Stop hook can *propose* updates back to the skill/CLAUDE.md. Aligns with the skill-creator ethos (gotchas grow as edge cases appear → a skill can feed its own growth).
- **Cut from cc-large (off-topic to skill-authoring):** agentic-search depth, LSP/codemap setup, brain/hands subagents, org ownership/DRI/regulated-industry. Their proper home is repo `docs/` + CLAUDE.md/AGENTS.md, not a skill-creation tool.
- **Survival rule (anti-slippery-slope):** a cc-large idea lives — as a one-liner — only if it changes the author's judgment *at the gate*. Awareness yes, operational depth no.

## Governing rule (decides every keep/cut)

**Not in the official base → default CUT.** Survives only if it fills a genuine gap AND earns its place (distilled, not dumped). A *classification ritual* (label-pinning that doesn't change what you build) never earns it; a *judgment shift* (changes the decision) can.
- 9-category / uplift-vs-preference / problem-vs-tool-first = rituals → CUT.
- cc-large harness philosophy = judgment shift + explicit user mandate → KEEP.

## Locked decisions

1. **Spine = official base** (re-baseline), not the current 5-Phase framework. (Q2 → B)
2. **Keep eval harness** (it's official anyway).
3. **Graft = distill, not dump.** No revival of 600-line reference files. (Q3)
4. **All 3 classification axes CUT** — 9 categories (+ delete 346-line `skill-categories.md`), capability-uplift/encoded-preference, problem-first/tool-first. Official has zero classification steps; these are rituals. (Q3 reversed from 나→가 per user.)

## Resolved (was open)

- cc-large entry → **all inline, no new file** (only 3 small survivors). (Q4 → 가)
- Tone → restore the official warm "explain the why / don't railroad" voice.
- Cut list → `references/` down to `schemas.md` only; delete the other 5 files; classification axes + 5-phase framing removed. Survivors that earn their place (eval-ops gotchas, trimmed platform quality-gate) folded inline.
- auto-optimize → **out of scope** (untouched).

## Recorded in

- ADR: `docs/adr/0001-rebaseline-skill-creator-pro-on-official.md`
- PRD/plan: deleted 2026-07-17 with the retired `docs/superpowers/` tree — recover from git history
  (`git log --diff-filter=D -- docs/superpowers/plans/2026-06-03-skill-creator-pro-v2-rebaseline.md`).
