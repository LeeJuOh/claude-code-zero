# PRD: skill-creator-pro v2 — re-baseline on the official skill-creator

> Source: grill-with-docs session 2026-06-03. Decisions recorded in
> `docs/adr/0001-rebaseline-skill-creator-pro-on-official.md` and the working
> glossary `plugins/skill-creator-pro/CONTEXT.md`.

## Problem Statement

I maintain `skill-creator-pro`, a fork of Anthropic's official `skill-creator`. Over many iterations (now v1.8.2) it drifted from the official base into something process-heavy and "weird": a rigid 5-phase pipeline, three separate classification rituals the user must walk through before writing anything (9 categories, capability-uplift vs encoded-preference, problem-first vs tool-first), and ~1685 lines of bundled reference files. The official base it came from is lean, flexible, and warm — it just helps you build one good skill. I want my plugin to feel like the official one again ("official + a few genuinely good ideas"), not like a framework. I also have three knowledge docs I thought would all add value, but two of them are already ~95% absorbed and only one (`cc-large-codebases.md`) holds net-new material — and even that is mostly about operating a harness at scale, not authoring a skill.

## Solution

Re-baseline `skill-creator-pro` on the official `skill-creator` SKILL.md (the lean coaching loop and tone), restore the eval harness to the official version as well (pro's entire harness — scripts, agents, eval-viewer, assets, `schemas.md` — is an undocumented fork, which the governing rule treats as drift to cut), and graft only **distilled, judgment-changing** ideas. A single governing rule decides every keep/cut: *not in the official base → cut by default; survives only if it fills a genuine gap and earns its place inline; classification rituals never earn it, judgment shifts can.* From `cc-large-codebases.md`, exactly three ideas pass the dual filter and enter as inline prose (no new reference file): a "is a skill the right primitive?" gate at intent capture, a skill-rot/retirement review, and a one-line "hooks can self-improve, not just block" note inside the gate. The result is a SKILL.md that reads like the official one plus a short harness-aware gate, with `references/` back down to `schemas.md` only.

## User Stories

1. As a skill author, I want the skill-creator to feel like the official one — a flexible coaching loop, not a numbered pipeline — so that I can jump in at whatever stage I'm at without ceremony.
2. As a skill author, I want to skip the forced "pick 1 of 9 categories" step, so that I spend my time building the skill instead of classifying it.
3. As a skill author, I want to skip the capability-uplift/encoded-preference and problem-first/tool-first labeling steps, so that the tool stops asking me to taxonomize before I've written a draft.
4. As a skill author, I want a short "is a skill even the right primitive?" gate at the start, so that I don't build a skill when the knowledge actually belongs in CLAUDE.md, a hook, or an MCP.
5. As a skill author new to the harness, I want that gate to name the five extension points (CLAUDE.md / hooks / skills / plugins / MCP) as a decision, so that I become aware of the alternatives exactly when the choice matters — without reading a lecture on harness operations.
6. As a skill author, I want a one-line reminder that hooks can self-improve (a Stop hook proposing updates back to the skill), so that I see hooks as more than guardrails when the gate suggests one.
7. As a skill author, I want a skill-rot/retirement review, so that when a model update makes my skill redundant or constraining I trim or retire it instead of carrying overhead.
8. As a skill author, I want the eval harness (test prompts, with-skill vs baseline runs, grader, benchmark viewer, description optimizer) restored to the official version — replacing pro's undocumented fork — so that I run the maintained official harness rather than drift. The interface (script names, workflow steps) is unchanged, so my measurement workflow keeps working.
9. As a skill author, I want the eval-operation gotchas kept (snapshot before improving, never reuse iteration numbers, kill the viewer, create the workspace before spawning, don't over-design), so that I don't silently corrupt a baseline or leave zombie viewer processes.
10. As a skill author, I want a short quality-gate of the non-obvious platform traps (YAML boolean names, reserved `claude`/`anthropic`, unquoted colons in description, built-in slash-command name collisions, the description char budget), so that `claude plugin validate .` doesn't fail on a surprise.
11. As a skill author, I want the obvious checklist items dropped and delegated to `quick_validate.py`, so that the SKILL.md isn't padded with things a script already checks.
12. As a skill author, I want platform-spec details fetched from the official docs at build time rather than frozen in a `platform-reference.md`, so that I'm never working from a stale spec.
13. As a skill author, I want the description-optimization loop kept, so that I can still tune triggering accuracy on a held-out eval set.
14. As a skill author working in Claude.ai or Cowork, I want the environment-specific instructions preserved, so that the skill still works without subagents or a browser.
15. As the plugin maintainer, I want the `description` in `plugin.json` and `marketplace.json` updated to drop "category-aware" language, so that the advertised capabilities match what the skill actually does.
16. As the plugin maintainer, I want the version bumped to `2.0.0`, so that the breaking redesign is signalled by SemVer.
17. As the plugin maintainer, I want the README rewritten philosophy-first (why you'd want it), so that it follows the repo's README style instead of listing features.
18. As a future maintainer, I want the ADR and this PRD recorded, so that I understand why the mature v1.8.2 features were deliberately removed and don't "restore" them.
19. As the plugin maintainer, I want `auto-optimize` left untouched, so that the autoresearch sub-skill keeps working independently of this redesign.
20. As a skill author, I want the warm "explain the why / avoid ALWAYS-NEVER / don't railroad" voice restored, so that the instructions coach rather than command.

## Implementation Decisions

**Spine.** Replace the current 5-phase `SKILL.md` body with the official `skill-creator` coaching loop (capture intent → draft → test → evaluate-with-user → improve → repeat → description optimization → package). Restore the official tone. Source spine: `references/claude-plugins-official/plugins/skill-creator/skills/skill-creator/SKILL.md`.

**Modules (a skill is a prompt artifact; "modules" = its components):**

- *Eval harness* — the deep, stable module. `scripts/` (`run_eval`, `aggregate_benchmark`, `improve_description`, `run_loop`, `package_skill`, `quick_validate`, `generate_report`, `utils`), `agents/` (`grader`, `comparator`, `analyzer`), and `eval-viewer/`. **Restored to official.** Pro's entire harness is a fork — *every* component differs from official (8 scripts, 3 agents, `eval-viewer/`, `assets/eval_review.html`, and `schemas.md`; e.g. `generate_report.py` 153 lines vs official's 326). None of these changes is one of the three targeted philosophies (those live in SKILL.md prose) and none is documented, so the governing rule treats them as drift → replace each component with the official version, as a set.
- *`references/schemas.md`* — **restored to the official 430-line version**, paired with the official scripts it describes. This also closes a pre-existing gap: pro's `agents/grader.md` references `metrics.json`, which pro's trimmed `schemas.md` no longer documented (official documents both `history.json` and `metrics.json`).
- *"Right primitive?" gate* — NEW, inline at intent capture (~8–12 lines). Names the five extension points as a decision and folds in the one-line hooks-as-self-improvement note. No new reference file.
- *Skill-rot / retirement review* — NEW, inline (~3–4 lines), replacing/absorbing the old narrow "Model Update Check": models evolve, a skill built to patch a limitation becomes overhead, be willing to trim or retire on model updates.
- *Distilled gotchas* — eval-operation gotchas folded into the eval/improve sections; a trimmed quality-gate of non-obvious platform traps near packaging.

**Deletions:** `references/skill-categories.md`, `references/design-patterns.md`, `references/troubleshooting-guide.md`, `references/platform-reference.md`, `references/eval-writing-guide.md`. Remove the three classification axes and the 5-phase framing from `SKILL.md`. Critical substitutions (`${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_DATA}`) survive as inline one-liners; deeper platform spec is fetched from official docs on demand.

**Housekeeping:** version `1.8.2 → 2.0.0` in `marketplace.json` (local plugin → version lives in marketplace.json only). Update `description` in both `plugin.json` and `marketplace.json` to remove "category-aware design"/classification language. Rewrite `README.md` philosophy-first. `name` stays `skill-creator-pro`.

**No frozen platform numbers (AGENTS.md mandate).** The official spine carries *no* char-budget figures — the description has no hardcoded cap, and body size is just "<500 lines ideal (approximate)". v2 matches: drop v1.8.2's hardcoded numbers (the `1,536`-char description cap at SKILL.md L347, the `1% / 8,000-char / SLASH_COMMAND_TOOL_CHAR_BUDGET` body line at L381) rather than re-freezing them. The repo's two stale copies (v1.8.2 → 1,536, `skill-building-guide.md` → 1,024) are exactly the frozen-spec drift this redesign deletes `platform-reference.md` to avoid. If an exact current cap is ever needed at build time, fetch it live from `skills.md` — never bake the number into SKILL.md or this PRD.

## Testing Decisions

A good test here checks **external behavior**, not the wording of the prompt: does the redesigned skill-creator trigger on the right requests, and does it still validate as a plugin. We do not assert on specific SKILL.md phrasing (implementation detail).

**Scope: medium** (chosen 2026-06-03). Validate + trigger eval + manual inspection; the full dogfood harness run is *not* part of this build.

- *Platform validation (required).* `unset CLAUDECODE && claude plugin validate .` must pass.
- *Description trigger eval (the one quantitative gate).* Run the existing description-optimization loop (`run_loop.py`) once on v2's description and accept it if it clears the loop's held-out test score. No v1.8.2 baseline — the actual trigger phrases (`"make a skill"`, `"improve my skill"`, …) are unchanged; only the non-triggering "category-aware design" brag is dropped, so this just confirms the rename didn't hurt triggering. This is the harness's own loop, run once — dogfooding, not a new gate.
- *Manual inspection.* Read v2 end-to-end against the official spine: no forced classification step, the gate present at intent capture, `references/` down to `schemas.md`, warm tone restored.
- *Deferred (out of this build):* the with-skill-vs-baseline dogfood comparison (v2 vs v1.8.2 snapshot) via the eval viewer. Available later if a regression is suspected, but not run now.
- The eval harness is restored to official code; a single end-to-end eval smoke run confirms the swap didn't break invocation, but official harness *logic* is not re-tested.

## Out of Scope

- `auto-optimize` sub-skill — untouched.
- cc-large-codebases material that failed the filter: LSP/codemap setup, brain/hands subagent splitting, agentic-search depth, organizational ownership (DRI, agent manager, regulated-industry rollout). Their home is repo `docs/` + CLAUDE.md/AGENTS.md.
- Any new reference files. The redesign is net-subtractive on `references/`.
- Authoring depth for MCP servers or hooks as standalone subsystems (the gate only *points* at them).

## Further Notes

- `plugins/skill-creator-pro/CONTEXT.md` is the live glossary for this work (governing rule, term definitions, locked decisions). Keep it in sync if decisions change.
- Net effect on `references/`: 6 files (~1685 lines) → 1 file (`schemas.md`), matching the official footprint.
- Risk: re-adding harness/hook content is the slippery slope that caused the original drift. The survival rule (a cc-large idea lives only if it changes the author's judgment at the gate, and only as a one-liner) is the guardrail.
