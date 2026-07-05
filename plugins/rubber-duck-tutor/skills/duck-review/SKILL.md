---
name: duck-review
disable-model-invocation: true
description: "PR/change-review session with the rubber duck — user justifies every change and predicts consequences. Use before commit/push/PR, or when they say \"duck review\", \"check before review\". Not for code-level explanation (/duck-verify) or plan review (/duck-prebuild)."
allowed-tools: Read Grep Glob Bash(git diff *) Bash(git log *) Bash(git status *) Bash(bash ${CLAUDE_PLUGIN_ROOT}/skills/ducking/scripts/log-gap.sh *)
---

# Duck — PR / Change Review Mode

**Read first**: [`../ducking/engine.md`](../ducking/engine.md) — persona, "Wait for their answer", Confidence Check (PR/Change Review row), Branch-first workflow, Intensity Scaling, Uncertainty Check, Session Wrap-up + gap persistence, Facilitation, Gotchas. They apply here.

**Input**: Run `git diff` (or `git diff --staged`, or PR diff).

## Flow

1. **One-sentence summary** — always ground the question in the diff's scope:

> **Your turn:** You touched [list the changed files/areas from the diff]. Summarize this entire change in one sentence — what does it do?

2. **Drill into 2-3 key changes** from the diff:

> **Your turn:** In [file:line_range], you changed [specific thing]. Why?

3. **Impact assessment**:

> **Your turn:** What existing behavior could this change break? Where should we look?

   → Then run the **Temporal cost simulation** subsection below before moving on.

4. **Generation vs comparison** (when appropriate):

> **Your turn:** For [the problem this code solves] — how would you have approached it?

   After their answer, compare with the actual implementation. Discuss trade-offs.

5. **Confidence check** — run the PR/Change Review row from the [Confidence Check (shared)](../ducking/engine.md#confidence-check-shared) table.

## Temporal cost simulation

Frame the change on a 6-month horizon, not just "does it work now":

> **Your turn:** Six months from now, someone — maybe future you — has to modify this code. Where's it going to hurt first? Why?

Follow-ups depending on their answer:
- Names a specific file/function → "Why is that spot fragile? What assumption in the current structure breaks first?"
- "Nothing feels fragile" → "What's that confidence based on? What abstraction in this diff guarantees that?"
- Vague ("kind of everywhere") → "Just one spot. If you commit this now, what's the first thing you'll regret?"

## Question Frameworks

**Assumptions** — "What has to be true for this change to hold up?" Surface dependencies on other code, data formats, or system state.

**Blindspots** — "What could break outside this diff?" Force them to think beyond the changed files.

## Techniques

Prioritize: teach-back, generation then comparison, concrete to abstract. See [../ducking/references/exercise-patterns.md](../ducking/references/exercise-patterns.md) for execution details.

## Closing

Run **Uncertainty Check** and **Session Wrap-up** from the engine, including gap persistence.
