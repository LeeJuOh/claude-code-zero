# Re-baseline skill-creator-pro on the official Anthropic skill-creator

Status: accepted

`skill-creator-pro` v1.8.2 had drifted from the official Anthropic `skill-creator` it forked from into a process-heavy framework — a rigid 5-phase pipeline, three classification rituals (9 categories, capability-uplift/encoded-preference, problem-first/tool-first), and ~1685 lines of reference files. We will re-baseline on the official skill-creator's lean, flexible coaching loop, restore the eval harness to official as well (pro's is a full, undocumented fork — every component differs — which the governing rule treats as drift to cut, since none of it is a targeted philosophy), and graft only **distilled, judgment-changing** ideas — undoing the bloat rather than adding to it.

## Governing rule

Anything not in the official base is **cut by default**, and survives only if it fills a genuine gap AND earns its place (distilled inline, never dumped as a reference file). A *classification ritual* (label-pinning that doesn't change what gets built) never earns it; a *judgment shift* (changes the author's decision) can.

## Considered options

- **(A) Full rewrite from scratch** — rejected; discards the mature, working eval harness and risks regression for no gain.
- **(B) Keep the 5-phase framework, trim inside it** — rejected; the rigid pipeline *is* the core drift, so trimming around it leaves the problem in place.
- **(C) Re-baseline on the official spine** — chosen; removes the drift at its root, restores the warm "explain the why / don't railroad" tone, and restores the eval harness to official too (pro's is a full, undocumented fork — drift by the governing rule).

## Consequences

- Removed: the 5-phase framing and all three classification axes; the reference files `skill-categories.md`, `design-patterns.md`, `troubleshooting-guide.md`, `platform-reference.md`, `eval-writing-guide.md`. `references/` returns to `schemas.md` only (matching official).
- Kept despite not being in official, because they prevent real failures (they earn their place, distilled inline): the eval-operation gotchas (snapshot before improving, never reuse iteration numbers, kill the viewer, create the workspace before spawning, don't over-design) and a trimmed quality-gate of non-obvious platform/validation traps.
- From `cc-large-codebases.md`, only three ideas survive the dual filter (not-in-official + must improve a skill *creator*): the "is a skill the right primitive?" gate, the skill-rot/retirement review, and a one-line "hooks are for self-improvement, not just blocking" note folded into the gate. All other cc-large material (LSP/codemap, brain/hands subagents, org ownership) is operating-a-harness knowledge whose home is repo `docs/` + CLAUDE.md, not a skill-creation tool.
- Breaking change → major version bump to `2.0.0` in `marketplace.json`. The `description` in `plugin.json` and `marketplace.json` and the `README.md` must drop "category-aware" language, since categories are gone.
- The `auto-optimize` sub-skill is untouched (separate skill, autoresearch-derived, not part of this drift).
