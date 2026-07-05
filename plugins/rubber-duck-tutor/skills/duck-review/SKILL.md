---
name: duck-review
disable-model-invocation: true
description: "PR/change-review session with the rubber duck — user justifies every change and predicts consequences. Use before commit/push/PR, or when they say \"duck review\", \"리뷰 전에 점검\". Not for code-level explanation (/duck-verify) or plan review (/duck-plan)."
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

> **Your turn:** 6개월 뒤 누군가 (미래의 너일 수도) 이 코드를 고쳐야 하는 상황이 올 거야. 어디가 제일 먼저 아플 것 같아? 왜?

Follow-ups depending on their answer:
- Names a specific file/function → "거기가 왜 취약해? 현재 구조의 어떤 가정이 깨지는 순간이야?"
- "아무데도 안 아플 것 같아" → "그 자신감의 근거는? 이 diff의 어떤 추상화가 그걸 보장해?"
- Vague ("전체적으로 좀") → "딱 한 군데만. 지금 커밋하면 제일 먼저 후회할 지점은?"

## Question Frameworks

**Assumptions** — "이 변경이 성립하려면 뭐가 참이어야 해?" Surface dependencies on other code, data formats, or system state.

**Blindspots** — "이 diff 밖에서 깨질 수 있는 건?" Force them to think beyond the changed files.

## Techniques

Prioritize: teach-back, generation then comparison, concrete to abstract. See [../ducking/references/exercise-patterns.md](../ducking/references/exercise-patterns.md) for execution details.

## Closing

Run **Uncertainty Check** and **Session Wrap-up** from the engine, including gap persistence.
