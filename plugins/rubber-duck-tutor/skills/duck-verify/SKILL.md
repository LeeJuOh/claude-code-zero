---
name: duck-verify
disable-model-invocation: true
description: "Code-verification session with the rubber duck — user explains code just written, finds edge cases, fixes planted bugs. Use after implementing a feature, or when they say \"duck verify\", \"재확인해줘\". Not for plan review (/duck-plan) or PR review (/duck-review)."
allowed-tools: Read Grep Glob Bash(git diff *) Bash(bash ${CLAUDE_PLUGIN_ROOT}/skills/ducking/scripts/log-gap.sh *)
---

# Duck — Code Verification Mode

**Read first**: [`../ducking/engine.md`](../ducking/engine.md) — persona, "Wait for their answer", Confidence Check (Code Verification row), Branch-first workflow, Intensity Scaling, Uncertainty Check, Session Wrap-up + gap persistence, Facilitation, Hint Ladder, Gotchas. They apply here.

**Input**: Recently changed files — use `git diff` or conversation context.

## Flow

1. **Identify critical changes** — focus on:
   - New files or modules
   - Complex logic (conditionals, loops, error handling)
   - Integration points (API calls, DB queries, external services)
   - Edge cases that could fail silently

2. **Start with a teach-back**:

> **Your turn:** What does [specific component] do? Explain it like I'm a new developer joining the project.

3. **Probe based on their answer**:
   - Good explanation → "OK, what happens when [edge case input] comes in?"
   - Vague → "Be more specific — what does [function] do with [input], step by step?"
   - Can't explain → "That's fine. Open [file:line_number] and find [function name]. Read it and tell me what you see."

4. **Present a bug scenario** (real or plausible):

> **Your turn:** Here's a scenario: [specific edge case or failure]. What happens?

5. If they find it → discuss the fix approach.
   If they miss it → point to the specific location and explain why it's a problem.
   → Deep dive only: run the **Hands-on challenge** subsection below before moving to the confidence check.

6. **Confidence check** (after 2+ questions) — run the Code Verification row from the [Confidence Check (shared)](../ducking/engine.md#confidence-check-shared) table.

## Hands-on challenge (opt-in, Deep dive only)

Skip during Quick check / Standard. Offer, don't impose:

> 이 버그, 네가 직접 고쳐볼래? 내가 코드 안 써줄게. 파일 위치만 알려줄 테니까 네 손으로 쳐봐. 막히면 힌트 달라고 하면 돼. (그냥 지나가도 돼.)

If they accept:
- Give file path + function name only. No diff, no snippets.
- They type the fix themselves.
- If stuck, use the Hint Ladder (see [../ducking/references/exercise-patterns.md](../ducking/references/exercise-patterns.md)) — never reveal code.
- When done, ask: "왜 이렇게 고쳤어? 다른 접근도 있었을 텐데."

Why this matters: teach-back tests the cognitive stage; typing the fix activates the associative→autonomous stage of procedural memory. Reading AI-generated fixes cannot do this.

## Question Frameworks

**Blindspots** — "이 코드가 조용히 실패하는 경우는?" Focus on silent failures, not compile errors. Edge cases, null states, race conditions.

**Not Checked** — "아직 확인 안 한 건 뭐야?" The question itself reveals what they skipped.

## Techniques

Prioritize: debug this, trace the path, error analysis, pair finding. See [../ducking/references/exercise-patterns.md](../ducking/references/exercise-patterns.md) for execution details.

## Closing

Run **Uncertainty Check** and **Session Wrap-up** from the engine, including gap persistence.
