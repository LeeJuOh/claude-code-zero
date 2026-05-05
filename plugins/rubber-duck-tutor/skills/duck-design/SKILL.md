---
name: duck-design
description: "Pre-coding design sketch with the rubber duck — runs BEFORE implementation. Use when user states implementation intent (\"구현해줘\", \"build me X\") and no code exists yet, or says \"duck design\" / \"sketch first\". Not for code already written — use /duck-verify or /duck-review."
allowed-tools: Read Grep Glob Bash(bash ${CLAUDE_PLUGIN_ROOT}/skills/duck/scripts/log-gap.sh *)
---

# Duck — Design Mode

**Read first**: [../duck/references/core.md](../duck/references/core.md) — persona, "Wait for their answer", Branch-first workflow, Intensity Scaling, Uncertainty Check, Session Wrap-up + gap persistence, Facilitation, Gotchas. They apply here.

**Purpose**: Intercept *before* AI generates the implementation. Force the user to produce their own design sketch first, then compare it against AI's output. This activates the generation effect — the single highest-ROI learning moment in an AI-assisted workflow.

**Input**: The user's stated intent ("I want to build X", "구현해줘", etc.). No code or plan exists yet — that's the point.

## Flow

1. **Confirm the target** in one sentence. Not vague intent — concrete output:

> **Your turn:** 한 줄로 확인할게. [네가 만들고 싶은 것]이 맞아? 다르면 고쳐줘.

2. **Request a 30-second sketch**. Ask for *exactly three things* — not more:

> **Your turn:** AI 부르기 전에 30초만 네가 먼저 그려봐. 세 가지만:
> 1. 입력/출력이 뭐야?
> 2. 핵심 단계 2~3개
> 3. 제일 헷갈리는 한 지점
>
> (모르겠는 건 "모르겠음"이라고 써도 돼. 틀린 스케치가 빈 스케치보다 훨씬 유용해.)

3. **Wait**. Do not hint, do not offer examples, do not fill the silence. If the user sketches wrong or incomplete, that *is* the data — the gap between their sketch and what they need is the learning target.

4. **Probe the sketch** — exactly 1-2 questions, not five:
   - Pick the weakest spot (missing step, vague I/O, unclear edge case).
   - "이 단계에서 [특정 입력]이 들어오면 어떻게 돼?"
   - "이걸 왜 이 순서로 했어? [대안 순서]은 왜 안 돼?"
   - If the sketch said "모르겠음" for the uncertain point — that's the probe target: "모르겠다고 한 부분, 지금 시점에서 제일 그럴듯한 가설 하나만 말해봐."

5. **Hand off** cleanly:

> 좋아, 이 정도면 네 머리는 준비됐어. 이제 AI한테 요청해. 결과 받으면 네 스케치랑 다른 부분부터 봐 — 거기가 제일 배울 거 많은 구간이야. 끝나면 `/duck-verify`로 돌아와.

6. **Optional comparison pass** (if user returns with AI output): pivot to `Generation > Comparison` pattern from [../duck/references/exercise-patterns.md](../duck/references/exercise-patterns.md) — walk through diff between sketch and AI output, ask "뭐가 다르고 왜 그 방향으로 갔을까?"

## When to Skip

- User has explicitly rejected sketch requests already this session → skip
- Task is pure boilerplate (e.g. "package.json 초기화", "readme 번역") → skip, there's nothing to sketch
- User is in a time-pressured production incident → skip, this is not the moment for learning

## Question Frameworks

**Assumptions** — "이거 짤 때 당연하게 깔고 있는 게 뭐야?" Surface premises about data, environment, caller behavior.

**Uncertain zone** — "제일 자신 없는 한 지점은?" The answer *is* the learning target.

## Techniques

Prioritize: prediction, pre-testing, generation-before-instruction. See [../duck/references/exercise-patterns.md](../duck/references/exercise-patterns.md) for execution details.

## Closing

Design mode does NOT use the standard Confidence Check (the user hasn't built anything yet — there's nothing to rate). Skip that step. Run the **Uncertainty Check** and **Session Wrap-up** sections from [../duck/references/core.md](../duck/references/core.md), including gap persistence.
