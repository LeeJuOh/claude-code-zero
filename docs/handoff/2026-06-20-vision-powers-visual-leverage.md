---
topic: vision-powers-visual-leverage
date: 2026-06-20
---

# vision-powers Visual Leverage (issue 002)

## Goal

Implement `docs/issues/002-vision-powers-visual-leverage.md` — add three improvements across vision-powers skills via tracer-bullet slices:

- **A — anti-slop Tells**: reference the behavioral-slop catalogue so authoring avoids summary-leak / linear dump / forced diagram / generic label / uniform density / empty decoration / accent overuse.
- **B — visual self-audit**: after the gate passes, render HTML → PNG → Read it → check density/hierarchy/Mermaid/overflow → fix & re-render (max 2). Graceful skip when Chrome absent.
- **C — cleanups**: plugin-visual template wording + md leftover check; report-manager MCP-fail notice; fact-check gate re-check.

**Hard invariant (never break):** design/taste/CSS stays **delegated to the model**. These slices add *leverage* (guardrails + verification) only — never dictate layout. Framing is always "block the bad default," never "use this design."

## First Action

Fan out **Slices 3, 4, 5, 6 in parallel** (user chose option 2 — conflict-free, different files). Spawn 4 subagents, each replicating the proven doc-visual reference wiring (commit `7c80dc4`). The reference diff is the spec — have each agent read it first:

```
git show 7c80dc4 -- plugins/vision-powers/skills/doc-visual/SKILL.md
```

That diff shows the exact 3-edit pattern to copy into each target skill:
1. **A-pointer** in the content-shaping/authoring section → reference `anti-slop-tells.md`.
2. **Reference-table rows** → add `anti-slop-tells.md` + `visual-self-audit.md`.
3. **Post-gate "Visual self-audit (HTML only)" section** → render-report.js → Read PNG → density/hierarchy/Mermaid/overflow rubric → max 2 passes → Chrome-absent graceful skip.

Each agent adapts wording to that skill's own diagrams and inserts the self-audit step **right after its existing artifact-gate invocation** (anchors below). Then verify all, run `claude plugin validate`, and report before committing.

Subagent split (each = one independent file-group, zero overlap):
| Agent | File(s) | Slice | Notes |
|---|---|---|---|
| 1 | `skills/diff-visual/SKILL.md` | 3 | gate at line ~168. A+B only. |
| 2 | `skills/plugin-visual/SKILL.md` | 4 | gate at line ~335 (HTML/`analyze` mode). A+B **+ C**: see Decisions. |
| 3 | `skills/context-health-visual/SKILL.md` | 5 | gate at line ~241. A+B only. |
| 4 | `skills/report-manager/SKILL.md` + `skills/fact-check/SKILL.md` | 6 | report-manager: A+B + MCP-fail notice. fact-check: **C only** + **add `Bash(node *)` to fact-check frontmatter** (else the gate re-check can't run). See Decisions. |

(All paths under `plugins/vision-powers/`.)

## Context

Slice 2 (doc-visual) is the **tracer** — fully proven end-to-end before fan-out, so the remaining slices are low-risk mechanical replication. The whole point of slicing this way was de-risk: prove the A+B pattern once on the flagship, then copy. That's now done. Slices 3–6 each edit a different SKILL.md → no file conflicts → safe to parallelize. Slice 7 is release (blocked by 3,4,5,6).

`allowed-tools` (verified this session): diff-visual, plugin-visual, context-health-visual, and report-manager all already have `Read` + `Bash(node *)` → **no frontmatter change** for A+B. **Exception — fact-check**: its `allowed-tools` has no `Bash(node *)`, so the Slice-6 gate re-check (`node artifact-gate.js`) **will not run until `Bash(node *)` is added to fact-check's frontmatter**. That edit is required, not optional.

## Current Progress

Committed on **`develop`**:
- `abb1db6` — Slice 1: created `plugins/vision-powers/references/design-system/anti-slop-tells.md` + `visual-self-audit.md`.
- `7c80dc4` — Slice 2: wired doc-visual (A+B) + proven via inline demo.
- `da66104` — Slices 3–6: fanned out A+B to diff-visual, plugin-visual (+C-1/C-2), context-health-visual, report-manager (+MCP-fail notice, `${CLAUDE_SKILL_DIR}/../..` path form); fact-check got C-only (gate re-check + `Bash(node *)` added to allowed-tools). Verified via grep cross-check + `claude plugin validate .` (pass-with-warnings, version-in-marketplace only). **Slices 3–6 DONE.**

**Remaining: Slice 7 only** (release). Blocked-by 3,4,5,6 is now cleared.

**Uncommitted:** `docs/issues/002-vision-powers-visual-leverage.md` (reviewed+edited spec) and this handoff doc are both untracked. Commit them alongside Slice 7.

Demo proof (Slice 2): `sample.md` → authored HTML → `artifact-gate.js` (`ok:true`) → `render-report.js` (PNG, exit 0) → Read PNG → Mermaid/hierarchy/density/overflow all clean. Ran with real Chrome at `/Applications/Google Chrome.app`.

## Decisions Made

- **New refs path**: `plugins/vision-powers/references/design-system/` — NOT top-level `references/` (that's gitignored external repos; files there wouldn't ship and `${CLAUDE_PLUGIN_ROOT}/references/...` wouldn't resolve). Verified tracked via `git check-ignore`.
- **No deterministic measurement script** (Kami-style margin%/page-count): HTML has no fixed canvas + mechanizing design judgment violates the delegation invariant. Documented in visual-self-audit.md.
- **Version bump deferred to Slice 7**: 4.4.0 → **4.5.0** (SemVer minor; behavior change = new self-audit step). Local plugin → version lives in `marketplace.json` only (plugin.json has none).
- **C-1 (plugin-visual)**: resolve the "use report-template.md" (md mode) ↔ "No templates" (HTML mode) wording contradiction by clarifying the md template is an *information-structure schema, not aesthetics* — **rephrase, don't delete**.
- **C-2 (plugin-visual)**: add a light md-mode pre-publish check for leftover `{placeholder}` / dead links.
- **report-manager variable trap**: it calls the gate via `${CLAUDE_SKILL_DIR}/../../scripts/...` (not `${CLAUDE_PLUGIN_ROOT}`). The render-report.js wiring there must use the **same** `${CLAUDE_SKILL_DIR}/../..` form or paths break.
- **fact-check = C only**: it preserves structure (doesn't author new design), so no Tells/self-audit. Only adds a gate re-check **after injecting an HTML-format verification summary** (md-format summary → skip; the gate is HTML-only). ⚠️ fact-check's `allowed-tools` lacks `Bash(node *)` — **add it** or the `node artifact-gate.js` re-check silently can't execute. (report-manager already has it.)

## What Worked

- **Tracer-bullet discipline** — prove the flagship (doc-visual) fully, including a live render+Read demo, before fanning out. Caught nothing broken precisely because the pattern was de-risked first.
- **Pre-implementation review** — auditing the issue doc against real code first surfaced the HIGH path bug (gitignored `references/`) before it cost anything; fixes folded back into the spec.
- **Per-slice commits** — tight cadence, each slice independently revertible.

## What Didn't Work / Constraints

- ⚠️ **render-report.js fixed-height capture** (default `--height 8000`): it screenshots a fixed window, not full-page. Long reports clip at the bottom; the demo (short doc) showed the inverse — large empty under-fill. Documented as a known limit. Not a bug to fix here.
- ⚠️ **TaskCreate tool** needs schema loaded via `ToolSearch query "select:TaskCreate"` first, and is one-task-per-call (no `tasks` array). Skipped formal task tracking this session — fine for bounded work.
- Chrome is required for the *full* self-audit demo. Absent → only the graceful-skip path is verifiable. Don't let "demoable" falsely block on a Chrome-less env.

## Next Steps

1. ~~**Slices 3–6** (First Action) — fan-out wiring per the table.~~ ✅ DONE (`da66104`).
2. **Slice 7 — release** (NEXT) (`docs/issues/002...` AC + `docs/release-workflow.md` 8-step): bump `marketplace.json` to 4.5.0, update `plugin.json` + `marketplace.json` descriptions (additions only), `README.md`, add `CHANGELOG.md` 4.5.0 entry (existing file at `plugins/vision-powers/CHANGELOG.md`, latest 4.4.0), run `unset CLAUDECODE && claude plugin validate .`.
3. Commit the issue-doc 002 at some point (currently untracked).
4. Pre-release: `git fetch origin`, check tags, `git log develop..main` for cross-session commits.

## Reference

- Spec (all slice detail + AC): `docs/issues/002-vision-powers-visual-leverage.md`
- Reference implementation diff: `git show 7c80dc4`
- New shared refs: `plugins/vision-powers/references/design-system/{anti-slop-tells,visual-self-audit}.md`
- Domain glossary (Slop, Leverage vs delegation): `plugins/vision-powers/CONTEXT.md`
