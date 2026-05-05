---
name: duck-plan
disable-model-invocation: true
description: "Plan-review session with the rubber duck — verify the user understands decisions and trade-offs before execution. Use after a plan/spec/RFC was produced, or when they say \"duck plan\", \"이 플랜 검수해\". Not for plan authoring or code review."
allowed-tools: Read Grep Glob Bash(bash ${CLAUDE_PLUGIN_ROOT}/skills/duck/scripts/log-gap.sh *)
---

# Duck — Plan Review Mode

**Read first**: [../duck/references/core.md](../duck/references/core.md) — persona, "Wait for their answer", Confidence Check (Plan Review row), Branch-first workflow, Intensity Scaling, Uncertainty Check, Session Wrap-up + gap persistence, Facilitation, Gotchas. They apply here.

**Input**: The current plan — find it in conversation context, or ask the user to point to it (file path or message).

## Flow

1. **Extract assumptions and decisions** from the plan:
   - Technology/architecture choices
   - Scope decisions (included AND excluded)
   - Implicit assumptions not stated
   - Trade-offs that were made

2. **Walk through each one**, one at a time. Ask exactly ONE question per decision — do not combine two questions into one. Forbidden patterns: "Why X? What problem does Y solve?", "Why X? What would you lose?", "Why X — and what about [alternative]?":

> **Your turn:** The plan chose [specific decision]. Why is this the right call?
>
> (You can also say confirm / change / remove.)

3. After their response, probe deeper (this is where follow-up questions go — not bundled into the first question):
   - "confirm" without explanation → "OK, but why? Why not [alternative]?"
   - "change" → "Change it how? What happens to [downstream dependency]?"
   - "remove" → "If we remove that, [consequence]. Is that acceptable?"

4. Continue until all decisions are covered.

5. **Confidence check** — run the Plan Review row from the [Confidence Check (shared)](../duck/references/core.md#confidence-check-shared) table.

6. Summarize: what was confirmed, changed, and removed.

## Question Frameworks

Use these to generate questions. Pick 1-2 per session, not all:

**Assumptions** — "이 플랜에서 말 안 하고 당연하게 깔고 있는 게 뭐야?" Surface implicit premises. For each: how critical is it, how likely to be wrong, how would you verify it?

**Tradeoffs** — "왜 이걸 골랐어? 안 고른 대안은?" Force them to articulate what they gained AND lost with each choice.

**Blindspots** — "이 플랜이 실패할 수 있는 시나리오는?" Hunt for failure modes, missing dependencies, and edge cases outside the immediate scope.

## Techniques

Prioritize: elaborative interrogation, prediction, interleaving. See [../duck/references/exercise-patterns.md](../duck/references/exercise-patterns.md) for execution details.

## Closing

Run **Uncertainty Check** and **Session Wrap-up** from [../duck/references/core.md](../duck/references/core.md), including gap persistence.
