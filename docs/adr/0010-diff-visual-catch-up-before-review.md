---
status: accepted
amends: 0005
---

# 0010 — diff-visual is a catch-up tool read *before* review, not a review dashboard

## Context

diff-visual's eight sections (Overview, File Map, Key Changes, Architecture Impact, Change
Classification, Dependency Shift, New Components, Hot Spots) all describe *the change* and assume
the reader already knows the system the change lands in. That assumption was true when humans
wrote the code. It is false now: the user delegates implementation to agents, so for both their
own PRs and teammates' PRs there is no system they "already know". Usage confirms it — four months,
11 reports, all generated while developing plugins, zero at work.

Geoffrey Litt's *Understanding is the new bottleneck* (2026-07) and his `explain-diff` skill name
the missing thing: understanding exists to let the human **participate**, not merely verify, and
the tool's job is to **catch the reader up** (background → intuition → code → quiz) before any
judgement is made. His quiz is a *speed regulator*: he does not send or approve code until he can
pass it — a personal rule, not a mechanical gate.

## Decision

1. **diff-visual's purpose is catch-up.** Its deliverable answers "what was here, what is the idea,
   how does the code realise it, do I actually get it" — in that order — so that review (by the
   user or by `/code-review`) happens on an understood change. Its default **Mode** becomes
   *explainer*; *structural* review content is dropped, not hidden behind a flag.
2. **Sections are Litt's four**: Background (deep, collapsed + narrow), Intuition (idea + toy-data
   example + before/after flow diagram with example data), Code (literate walkthrough in
   understanding order; dependency change drawn before/after when it changed), Quiz (five,
   medium, no gotchas, answer options length-matched so form leaks nothing).
3. **The review sections are deleted**: Overview, File Map, Architecture Impact, Change
   Classification, Dependency Shift, New Components, Hot Spots. What still serves catch-up is
   absorbed (flow diagram → Intuition; dependency change → Code). Nothing in the report says
   "good" or "bad" — judgement is `/code-review`'s job.
4. **What diff-visual keeps that explain-diff lacks** stays: fact-sheet verification, code lifted
   only by extraction ([[0005]]), the gate, the Artifact channel, language detection, md format.
5. **The quiz is soft.** Consistent with [[0003]]: no hook, no block. "Pass before you push or
   approve" is documented as the intended ritual, not enforced.

## Considered options

- **Mode split** (`/diff-visual` review vs `--explain` catch-up) — rejected. The premise that
  there is a reader who already knows the system does not hold for agent-written code, which is
  now all of it; a review mode would keep a path nobody uses.
- **Switch to explain-diff outright** — rejected. It is 29 lines with no grounding: code is
  retyped by the model, and a reader who does not know the code cannot notice when it is wrong.
  For a catch-up tool a wrong snippet teaches a wrong system.
- **Quiz as a hook gate** — rejected per [[0003]].
- **eli5 tone** (considered in the 2026-08-22 handoff) — rejected; "explain to a five-year-old"
  underpitches a developer. explain-diff's Kleppmann-style line is kept; its measurable effect is
  an open experiment, not a settled fact.

## Consequences

- The report gets *shorter on facts about the change* and *longer on the world around it*. Users
  who wanted the quantitative dashboard lose it; no flag preserves it.
- Background and Intuition are **authored** by the model, not lifted from source — a deliberate
  step beyond the "re-structure, never compress" north star, bounded by the fact sheet (every
  claim sourced) and the extraction law for code.
- Dependency and flow diagrams must carry *example data* and must not carry verdicts.
- The `X-visual` name stays; the description, not the name, signals the new purpose.
