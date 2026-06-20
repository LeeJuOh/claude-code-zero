---
topic: vision-powers-audit
date: 2026-06-14
---

# vision-powers full audit

## Goal

Audit the **entire** `plugins/vision-powers/` plugin — not just this session's gate change — for **ungrounded / weird implementations** like the one we just caught (a `semantic-tokens.md` "JetBrains Mono forbidden" rule that no reference project actually follows, nearly mechanized into a gate check).

The audit direction: measure every internal rule/design choice against (a) the plugin's **own stated goal/philosophy** (`plugins/vision-powers/CONTEXT.md`) and (b) the two **reference projects** `references/Kami` and `references/taste-skill`. Keep what's grounded, fix/remove what isn't, and find improvement opportunities those references prove out.

## First Action

The v4.3.0 gate work is already committed (`fdc3a5f` feat + `386167e` docs handoff, on `develop`, unpushed) — **do not re-commit**. Start the audit directly: read `plugins/vision-powers/CONTEXT.md`, then run
`grep -rniE "forbidden|never|always|banned|must not" plugins/vision-powers/references/design-system/ plugins/vision-powers/skills/*/SKILL.md`
and cross-check every rule it surfaces against `references/Kami` + `references/taste-skill` (this is Next Step 1 — the JetBrains-Mono-class defect hunt).

## Context

This session started as a grill (`/grill-with-docs`) comparing Kami to vision-powers, narrowed to "make the code fulfill the gate the plugin's own CONTEXT.md promises," implemented 5 gate checks, then the user caught that a 6th (JetBrains Mono ban) was ungrounded. That catch is the *seed* of the next session: if one internal rule was invented, **others may be too**. The mandate widened from "implement v1" to "sweep the whole plugin for the same class of defect."

Mental model when pausing: vision-powers ≠ Kami in domain (Kami = editorial PDF/PPTX doc-gen; vision-powers = code/diff/doc → HTML wiki report). They overlap only in *self-contained styled HTML output + diagrams + design tokens + i18n*. So Kami/taste-skill are mined for **output discipline**, not features.

## Current Progress

This session = DONE and COMMITTED (`fdc3a5f`, branch `develop`, unpushed). Delivered v4.3.0 gate expansion:

- `scripts/artifact-gate.js` — 5 new checks: `checkMermaidClassDef` (rgb/rgba + `color:`), `checkForbiddenColors` (violet/fuchsia hex), `checkAnchorHrefs`, `checkImageAlt`, `checkPlaceholders`. Shared helpers `stripCodeRegions`, `extractMermaidBlocks`. All fail-level via existing retry loop.
- `scripts/artifact-gate.test.js` — 32 tests pass.
- A4 (`checkBlanketMono` / JetBrains Mono) was built then **removed** after the reference check disproved it.
- Docs synced: `artifact-gate.md`, `semantic-tokens.md` (rule corrected), `doc-visual`/`plugin-visual`/`diff-visual` SKILL.md authoring lists, CHANGELOG (4.3.0), `marketplace.json` (4.2.0 → 4.3.0).
- Memory saved: `[[verify-rules-against-references]]`.

`git status --porcelain` → 9 modified files, all under `plugins/vision-powers/` + `.claude-plugin/marketplace.json`.

## Decisions Made

- **Gate philosophy (keep):** "let the model handle taste, let the gate block slop" — gate mechanizes only **binary, reference-grounded** anti-patterns; subjective taste stays delegated. Matches CONTEXT's leverage-vs-delegation and ADR `docs/adr/0002`. The gate is the one leverage the model "can't be merely asked to guarantee — a request without a gate is a wish."
- **A3 violet/fuchsia kept** — grounded in taste-skill's "LILA rule" (purple = LLM signature).
- **A4 JetBrains Mono dropped** — NOT grounded; Kami bundles it as `--mono` (`references/Kami/styles.css:41`), taste-skill recommends `Satoshi + JetBrains Mono` (`references/taste-skill/skills/taste-skill/SKILL.md:171`). The real principle is "mono ≠ body font."
- **No new ADR** for the gate work — it implements existing ADR 0002.
- **Version = 4.3.0** (minor, feature add). vision-powers is local-source → version lives in `marketplace.json` only.

## What Worked

- **Process that paid off:** map the plugin with parallel Explore agents → for each internal "rule"/"FORBIDDEN", **grep the actual reference projects** before trusting it → mechanize only grounded rules → TDD against the node test file → keep churn minimal (shared helpers, fail-level reuse of the existing retry loop). Reuse this exact loop for the audit.
- **User's pushback ("do the references actually do that?") was the highest-value move** — bake it in proactively next time instead of waiting for it.
- Grounding recommendations in the plugin's *own* CONTEXT.md (not external taste) made the scope self-justifying.

## What Didn't Work

- ⚠️ **Treating `semantic-tokens.md` FORBIDDEN lists as reference-grounded.** They are internal assertions; at least one was an ungrounded misread. The whole audit exists because of this. Verify every such claim.
- ⚠️ **Don't run `node --test <dir>`** — this Node treats the dir arg as a module and reports a false "fail 1". Point at the file: `node --test plugins/vision-powers/scripts/artifact-gate.test.js`.
- Over-long, multi-option replies frustrated the user repeatedly — give a single recommendation, terse, then act. (Caveman-ultra Korean is on.)

## Next Steps (the audit)

Sweep **all** of `plugins/vision-powers/`, each item cross-checked against CONTEXT.md + Kami + taste-skill:

1. **Grep every internal rule** — `grep -rniE "forbidden|never|always|banned|must not" plugins/vision-powers/references/design-system/ plugins/vision-powers/skills/*/SKILL.md` — and verify each against the references. Flag any other JetBrains-Mono-class invention.
2. **Audit the unbuilt gate promises** named by CONTEXT.md/ADR 0002 but still unenforced: **lang consistency** (B3), **accent ≤ 2 per diagram** (B4). Decide build vs. demote-in-doc. Also consider C2 empty-section density and D slop regex (glassmorphism/gradient-text/em-dash) — taste-skill has the binary catalog.
3. **Self-containment gap** (CONTEXT line 11 promises "shareable as a single file", but reports hard-depend on Mermaid CDN `cdn.jsdelivr.net` + load no fonts). Kami is genuinely self-contained (inline SVG `references/Kami/assets/diagrams/`, local-first fonts + fallback chain, `references/Kami/scripts/verify.py` introspects output). Evaluate: pre-render Mermaid→inline SVG vs. status-quo+doc; font fallback chain. NOTE the cost: pre-render forces headless Chrome at gen time (deliberately avoided — see `render-report.js` comment).
4. **Audit the other skills/scripts not yet reviewed**: `context-health-visual`, `fact-check`, `report-manager`, and scripts `env-fit-scan.js`, `render-report.js`, `log-report.js`, `config.js`, `list-reports.js` — same lens (ungrounded rules, hardcoded fragility).
5. **Doc gap (low priority):** CHANGELOG has no 4.2.0 entry (the direct-authoring refactor, commit `4252baf`, ADR 0002). User said OK to leave it; backfill only if desired.

## Reference Map

- Plugin goal/philosophy: `plugins/vision-powers/CONTEXT.md` (glossary), `docs/adr/0002-doc-visual-direct-model-authoring.md`
- Design rules under audit: `plugins/vision-powers/references/design-system/` (semantic-tokens.md, artifact-gate.md, mermaid-patterns.md, diagram-*.md)
- Gate code/tests: `plugins/vision-powers/scripts/artifact-gate.js` + `.test.js`
- Reference projects (read-only, git-ignored): `references/Kami` (output discipline: `scripts/lint.py` token-drift, `scripts/checks.py` density/placeholder/orphan, `scripts/verify.py` output introspection, inline-SVG diagrams, font fallback), `references/taste-skill` (anti-slop binary checks, "let model handle taste / gate blocks slop", LILA purple rule, mono-for-technical-only)
- Prior related handoff: `docs/handoff/2026-06-06-doc-visual-artifact-redesign.md` (the v4.2.0 redesign that created the current direct-authoring architecture)
- Lesson memory: `[[verify-rules-against-references]]`
