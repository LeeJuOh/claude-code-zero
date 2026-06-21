---
status: accepted
---

# 0003 — rubber-duck-tutor rejects forcing-function gates, confronts at the ship point

## Context

rubber-duck-tutor exists because AI lets a developer outsource *thinking* but not
*understanding* — left unchecked, the developer rubber-stamps AI output without grasping it.
Two of the plugin's tenets pull in opposite directions:

- **(A) Understanding can't be outsourced** → the plugin has a duty to *verify* it.
- **(B) "Learning shouldn't compete with productivity"** (the duck creed) → it must not *force* it.

`references/no-numb` (a reference plugin) resolves this with a Stop-hook **forcing function**:
it blocks the session until the developer passes a quiz. That honors tenet A by violating tenet B.

Anthropic's learning research (the "17%" study) points the other way: the learning effect comes
from the *question*, not the *gate* — the cohort that benefited were **voluntary** questioners,
not people compelled by a wall.

## Decision

Reject blocking gates (Stop-block) and multiple-choice quizzes. The load-bearing distinction:

- A **gate** blocks work until a condition is met → violates tenet B.
- A **confrontation** is non-blocking but default-on → honors both tenets.

Verification fires as a **ship-point confrontation**: at `git push` / `gh pr create` /
`glab mr create`, one inline understanding question about the change just shipped. Non-blocking,
default-on, disable-able via config.

Verification **grain** is the **artifact** by default — *what* the deliverable does and *why* —
not line-level code comprehension, which is infeasible to verify exhaustively. Code-level
comprehension stays a **voluntary** deeper layer (`duck-verify`), never the forced default.

duck and no-numb are **complements**, not substitutes. A user who wants hard gates installs both;
duck does not import no-numb's forcing function.

## Considered options

- **(A) Forcing-function gate (no-numb style)** — rejected: imports a foreign identity and
  violates tenet B (friction-as-feature competes with productivity).
- **(B) Multiple-choice quizzes** — rejected: gate-shaped, and the effect lives in the question,
  not the format. Open-ended Socratic captures the same effect without the cage.
- **(C) Pure voluntary Socratic, any time** — rejected: with no default-on layer, verification
  collapses to opt-in and tenet A is abandoned for most users.
- **(D, chosen) Non-blocking ship-point confrontation, artifact grain, default-on** — honors
  tenet A (always confronted) and tenet B (never blocks).

## Consequences

- The **ship-point hooks become load-bearing for tenet A**. Drop them and only voluntary Socratic
  remains — the verification duty lapses. §1 (reject the gate) and §3 (ship-point confrontation)
  must be read together: §1 removes the blocking gate, §3 supplies the non-blocking teeth.
- Default verification grain is artifact-level; exhaustive code-line comprehension is explicitly
  **not** the target.
- A **shared ship budget** — `{git push, gh pr create, glab mr create}` fire at most once per
  session, first wins — prevents duplicate confrontations across platforms and tools.
- duck never blocks. Users who want hard enforcement compose duck + no-numb rather than asking
  duck to become a gate.
