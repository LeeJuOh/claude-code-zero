# Spec 016 — codex-advisor: 검수자 독립성 복원 (쓰기 독립 · 블록 정리 · fresh 서브에이전트 double-check)

> 생성: 2026-09-11 · 출처: grill-with-docs 세션 (codex-advisor 아키텍처 점검 → 독립성 누수 3곳 발견)
> 구현 이슈: `docs/issues/016-codex-advisor-independence.md` (S1~S6, 2026-09-11 그릴 완료 후 작성). ADR 0012 작성됨. 그릴 확정 사항은 D1~D3에 "그릴 2026-09-11" 표기로 인라인.
> 대상 플러그인: `plugins/codex-advisor/` (현재 v4.7.1 → v4.8.0, minor: 프롬프트·double-check 동작 변경, 명령 표면 동일)
> 용어집: `docs/context/codex-advisor.md` — **Double-check independence**, **Vendored prompt blocks**, **Five-way classification**, **Provenance debt** 절이 대상.
> ADR: 0004(prompt ownership)는 유지 — native path 불가침, task path는 우리 소유라는 결정이 이 스펙의 전제. ③은 ADR 후보(하단 §Further Notes).
> 근거 원문: `llm-wiki/wiki/concepts/verification-layers.md`, `evidence-gates.md`, `summaries/dynamic-workflows-cc.md`, `summaries/openai-model-guidance-gpt56.md`, `docs/origin/Harness design for long-running application development .md`, OpenAI "Using GPT-5.6" / "Using GPT-6 Astra" (`developers.openai.com/api/docs/guides/latest-model`, 2026-09-11 수령), `references/compound-engineering-plugin/.../validator-template.md`, `references/gstack/cso/SKILL.md`.
> **검증 상태**: 누수 3곳은 코드 대조로 확인된 사실. 처방 3개는 위키·references 원리에서 도출한 설계이며 실측 전.

## Problem Statement

codex-advisor의 존재 이유는 하나다: **Codex를 독립된 검수자로 쓴다.** 같은 모델이 자기 작업을 채점하면 관대해지므로(self-preferential bias), 다른 모델이 보고 그 결과를 Claude가 사후 분류한다.

이 세션에서 그 독립성이 세 군데서 새고 있음을 확인했다.

```
Claude(메인) ──프롬프트──▶ Codex ──결과──▶ Claude(double-check)
     ①                       ②                  ③
```

**① 쓰기 쪽 누수.** Claude가 Codex에 보내는 문구(adversarial의 focus text, rescue의 task text)에 자기 가설·원인 추정·의심 파일을 담아도 막는 규칙이 없다. Codex는 "이게 맞나 확인해줘"를 받는 순간 확인하는 쪽으로 기운다. 별도 모델이어도 self-evaluation으로 퇴화한다. 현재 SKILL.md에는 "verbatim 전달"만 있고 "무엇을 빼라"는 없다.

**② 프롬프트 블록 부채.** task path의 XML 블록은 Official 플러그인의 `gpt-5-4-prompting` 가이드에서 설계 시점에 복사한 것이다(vendored). 지금 모델은 GPT-5.6 계열, 곧 GPT-6 Astra. OpenAI 5.6 가이드는 "지시는 한 번만, 'ask first'류 반복은 불필요한 승인 요청을 유발한다"고 벤더 eval 수치와 함께 말한다. 우리 블록은 `completeness_contract` + `verification_loop` + `action_safety` 세 개가 비슷한 말을 반복하고, `action_safety`의 "위험하면 먼저 알려라"는 `approvalPolicy=never`인 task path에서 되묻기 = 턴 종료 = 작업 실패로 이어진다. Astra 가이드는 이전 모델보다 되묻는 성향이 강하다고 명시해 이 위험을 키운다.

**③ 읽기 쪽 누수 — 가장 큼.** "Codex 결과 전엔 소스를 읽지 마라"는 north star가 실제로 안 지켜진다. 이유 둘: (a) 지시문일 뿐 강제가 없다(hooks.json에 SessionStart 하나뿐). (b) 더 근본적으로, 스킬 호출 시점에 메인 Claude는 이미 그 코드를 **쓴 당사자**다. 안 읽어도 컨텍스트에 다 있다. `evaluation.md`의 "Self-Bias Awareness: 내가 쓴 코드면 인정해라"는 이 상황의 고백이지 해결이 아니다. 위키 원문: *"실제 작업하던 세션에 '검증도 해봐' 하면 매우 일부분만 잡아낸다."*

부수 잔재 하나: `spark` → `gpt-5.3-codex-spark` 별칭이 오늘 모델 캐시에 없는 모델을 가리킨다. 스펙 012가 남긴 유일한 모델 지식이다.

## Solution

독립성을 세 지점 모두에서 **구조로** 복원한다. 지시가 아니라 구조인 이유는 위키 `evidence-gates`의 원리 그대로다: *"강제는 무조건 AI 손 밖. AI가 강제하면 SOFT."*

- **① 쓰기 독립성**: Codex로 나가는 문구는 **증거만** 담는다 — 범위, 증상, 재현 조건, 유저 원문. 가설·원인 추정·의심 파일·기대 답은 제외. Phase 1.5 프리뷰가 제외분을 보여주고 사람이 확인한다.
- **② 블록 정리**: 세 블록을 5.6 가이드 구조(보고형 / 변경형 / 확인 필요형 3구간) + Astra follow-through 문구를 합친 **autonomy policy 한 블록**으로 교체. 지시는 한 번만.
- **③ 읽기 독립성**: Phase 4 double-check를 메인 Claude가 아니라 **fresh 서브에이전트**가 한다. 서브에이전트는 히스토리가 없으므로 "읽지 마라"가 필요 없다. 입력은 Codex finding 하나 + 인용 file:line + 분류 규칙뿐. 인용 존재 여부(False Positive의 fact 부분)는 스크립트가 먼저 판정한다.
- 부수: `spark` 별칭 삭제. 용어집에 app-server 프로토콜·모듈 경계·이 스펙의 세 원칙 반영.

유저가 보게 될 것: 명령 표면은 그대로. 프리뷰에 "제외됨(가설)" 항목이 생기고, double-check 보고에 "판정자: fresh subagent" 또는 열화 모드 라벨 "Self-verified — independent sub-task unavailable"이 붙는다.

## User Stories

1. As a codex-advisor 유저, I want Claude가 `/codex-adversarial`에 자기 가설을 실어 보내지 않기를, so that Codex가 Claude의 결론을 확인하는 대신 독립적으로 본다.
2. As a codex-advisor 유저, I want 프리뷰에서 "보내는 것 / 제외한 것(가설)"을 나눠 보기를, so that 제외가 과했으면 그 자리에서 되돌릴 수 있다.
3. As a codex-advisor 유저, I want focus 범위("login handler 쪽 봐줘")는 남고 원인 주장("null check 누락으로 auth bypass")만 빠지기를, so that 초점은 주되 답은 안 준다.
4. As a codex-advisor 유저, I want `/codex-rescue` task 텍스트에 유저 원문이 verbatim 남기를, so that 스펙 004의 "유저 말은 안 바꾼다" 계약이 유지된다.
5. As a codex-advisor 유저, I want rescue `--write` 실행이 되묻고 멈추지 않기를, so that `approvalPolicy=never`에서 턴이 질문으로 끝나 작업이 날아가지 않는다.
6. As a codex-advisor 유저, I want 작은 수정에 Codex가 과잉 테스트를 안 쓰기를, so that rescue 결과 diff가 요청 범위에 머문다.
7. As a codex-advisor 유저, I want verify/research 프롬프트가 더 짧기를, so that 5.6 계열에서 같은 품질을 더 적은 토큰으로 얻는다.
8. As a codex-advisor 유저, I want double-check가 내가 방금 Claude와 같이 쓴 코드에 대해서도 엄격하기를, so that "별거 아니네"로 넘어가는 finding이 없다.
9. As a codex-advisor 유저, I want double-check 판정자가 finding과 인용 줄만 보기를, so that 세션 히스토리가 판정에 스며들지 않는다.
10. As a codex-advisor 유저, I want 인용된 파일·줄이 존재하는지는 스크립트가 판정하기를, so that False Positive 분류가 모델 기분이 아니라 사실이다.
11. As a codex-advisor 유저, I want 보고서에 판정자가 누구였는지(fresh subagent / self-verified) 표시되기를, so that 열화 모드 결과를 정상 결과로 오해하지 않는다.
12. As a headless(`claude -p`) 유저, I want 서브에이전트가 불가할 때 스킬이 죽지 않고 self-verify로 내려가기를, so that 자동화 파이프라인이 끊기지 않는다.
13. As a codex-advisor 유저, I want finding이 0개일 때 서브에이전트가 안 뜨기를, so that 비용이 finding 수에 비례한다.
14. As a codex-advisor 유저, I want rescue `--write`의 diff 검수도 같은 fresh 판정자가 하기를, so that 네 스킬의 double-check 품질이 같다.
15. As a codex-advisor 유저, I want `--model spark`가 더 이상 죽은 모델로 확장되지 않기를, so that 존재하지 않는 slug가 config.toml에 조용히 쓰이지 않는다.
16. As a 유지보수자, I want 블록 문구 옆에 출처(5.6 가이드 / Astra 가이드 절 이름)가 남기를, so that 다음 모델 가이드가 나오면 무엇을 재동기화할지 안다.
17. As a 유지보수자, I want 플러그인에 모델 지식이 0이기를, so that 스펙 012의 결정이 완성된다.
18. As a 유지보수자, I want double-check 규칙(`evaluation.md`)이 서브에이전트 정의에서 참조되기를, so that 규칙이 두 곳에 복사돼 갈라지지 않는다.
19. As a 다음 세션의 에이전트, I want 용어집에 "companion은 `codex app-server` JSON-RPC를 쓴다, `codex exec`가 아니다"가 있기를, so that 호출 방식을 다시 조사하지 않는다.
20. As a 다음 세션의 에이전트, I want 용어집에 3층 모듈 경계(우리 / Official companion / Codex CLI)가 있기를, so that 어느 프롬프트를 우리가 소유하는지 바로 안다.
21. As a 다음 세션의 에이전트, I want 이 스펙에 ①②③ 각각의 메커니즘과 "왜 되는가"가 근거 링크와 함께 있기를, so that 그릴에서 재조사 없이 반박·수용을 판단한다.
22. As a codex-advisor 유저, I want native path(review/adversarial)의 Codex 쪽 프롬프트는 안 건드리기를, so that ADR 0004의 "우리가 못 왜곡하는 경로"가 그대로다.

## Implementation Decisions

### D1 — ① 쓰기 독립성: "증거만" 규칙 + 프리뷰 분리

적용 스킬 4개: `codex-adversarial`(focus text), `codex-rescue`(task text), `codex-research`(topic — 그릴 2026-09-11에서 추가: `Topic: <literal topic>` 칸을 Claude가 채움), `codex-verify`(focus 인자 **신설** — 지금은 경로만 받고 Focus areas는 프리뷰에서만 수정 가능. 인자로 받아 Focus areas에 추가). `codex-review`는 focus 금지라 대상 아님.

Phase 1 ANALYZE에 분류 축 하나 추가. 입력 토큰을 셋으로 나눈다.

| 분류 | 예 | 처리 |
|---|---|---|
| **증거(evidence)** | 대상 범위·파일 영역, 증상, 재현 조건, 로그 인용, 유저 원문 요청 | 전달 |
| **초점(focus)** | "auth 흐름 위주로", "동시성 쪽" | 전달 — 답이 아니라 방향 |
| **가설(hypothesis)** | 원인 주장, 기대 답, "X 때문일 것", 의심 파일:줄 단정 | **제외**. 프리뷰의 "제외됨(가설)" 칸에 표시 |

원리 출처: 위키 `dynamic-workflows-cc` "disjoint evidence에서 독립 가설 생성"; `references/gstack/cso` "파일 경로와 줄 번호만 (anchoring 방지)"; `references/harness-kit/dk-close-the-loop` "서브에이전트는 출력만 읽고 가설은 안 본다".

Phase 1.5 프리뷰(adversarial·rescue 둘 다 이미 있음)에 "제외됨(가설)" 항목 추가. 유저가 "Needs changes"로 되돌릴 수 있다 — 유저가 명시적으로 가설을 넣겠다면 그건 유저 결정이고, 규칙은 Claude의 기본값을 바꾸는 것이지 유저를 막는 게 아니다.

**`--no-preview` 플래그 삭제** (그릴 2026-09-11 결정). 4개 스킬 모두 항상 프리뷰. 이유: 분류는 Claude 판단(SOFT)이라 프리뷰 사람 확인이 유일한 검사 창인데, 플래그가 그 창을 우회한다. 대가: headless(`claude -p`)에서 이 4개 스킬은 AskUserQuestion 실패 → §9 규칙대로 exit 1. 현재 headless 사용 사례 없음 — 감수. User Story 12는 ③ 열화 모드에만 해당.

**그릴에서 기각** (2026-09-11): (a) 정규식 스크립트로 가설 감지 — `file:line`·단정어는 형태만 잡고 자연어 가설은 놓침, 유저가 정당하게 준 위치도 오탐. 판단 자체를 코드로 못 옮김. (b) Claude 변형 금지(유저 원문 verbatim만) — 유저는 Claude가 의도를 읽어 알맞은 focus를 써주길 원함. (c) 분류를 fresh 서브에이전트가 — ③ 결과 본 뒤 필요하면 재검토.

**방어선 구조**: 1(지시문)이 유일한 방어선. 2(프리뷰 `Excluded (hypothesis):`)는 1이 틀렸을 때 보이게 하는 검사 창. 3(`--no-preview` 삭제)은 검사 창 우회 제거.

**미결(그릴 대상)**: focus와 hypothesis의 경계. "login handler의 null check 봐줘"는 초점인가 가설인가. 이 세션의 잠정 기준: **주장(assertion)이 있으면 가설, 영역 지시만 있으면 초점.** 실제 사례 3~5개로 기준을 다듬은 뒤 SKILL.md에 예시로 박는다.

### D2 — ② 블록 정리: autonomy policy 한 블록

대상 스킬: `codex-rescue`(3블록 → 1블록), `codex-research`(1블록 병합). **verify는 손 안 댐** — 그릴 2026-09-11 전블록 대조 결과. Native path는 대상 아님(ADR 0004).

**전블록 대조표 (2026-09-11, 5.6·Astra 가이드 재수령 후)**:

| 스킬 | 블록 | 판정 | 이유 · 출처 |
|---|---|---|---|
| verify | `task` / `structured_output_contract` / `grounding_rules` | 유지 | 각 1회 지시, 충돌 없음 |
| verify | `completeness_contract` | **유지** (원안은 교체) | "문서 전체 보고 끝내라" 1회뿐. 반복·되묻기 없음. Astra §follow-through와 같은 방향 |
| research | `task` / `structured_output_contract` / `research_mode` / `citation_rules` | 유지 | 충돌 없음 |
| research | `grounding_rules` | **삭제** | "Label hypotheses" ≈ `structured_output_contract` "Separate facts/inferences" 중복. 5.6 §lean "state once" |
| rescue | `task` / `grounding_rules`(read-only) | 유지 | verbatim(004) / 충돌 없음 |
| rescue | `completeness_contract` / `verification_loop` / `action_safety` | **교체** | 셋이 같은 말 반복(5.6 §lean). `action_safety` "call out before taking" = 되묻기 = `approvalPolicy=never`에서 턴 종료. Astra §Initiative "unsolicited approval flows 금지" |

**Official adversarial 프롬프트** (`prompts/adversarial-review.md`, companion 런타임 로드): 대조 결과 되묻기 문구 없음, 읽기 전용이라 승인 경계 무관. 반복은 경미(품질 노이즈). ADR 0004 + 기각 목록에 따라 손 안 댐. upstream 정지(2026-07-07)라 다음 가이드와 충돌 시 task path로 이전하는 옵션만 남음 — 지금은 근거 없음.

**삭제** (rescue): `completeness_contract`, `verification_loop`, `action_safety`. rescue read-only의 `grounding_rules`는 유지. **삭제** (research): `grounding_rules`.
**유지**: `task`, `structured_output_contract`, `grounding_rules`, `research_mode`, `citation_rules` — 5.6/Astra 가이드와 상충 없음.
**신설**: `autonomy_policy` 한 블록. 이 세션에서 5.6 "Define autonomy and approval boundaries" 구조 + Astra "Initiative and follow-through" + "Testing and verification" 문구를 합쳐 초안:

```
<autonomy_policy>
For review, diagnose, or research requests, inspect the relevant materials and report. Do not implement changes.
For change or fix requests, make the requested in-scope local changes and run relevant non-destructive validation without asking first.
Bias towards action. Do not stop at a partial answer, a proposed plan, or an offer to continue.
Require confirmation only for external writes, destructive actions, or a material expansion of scope.
Do not write tests for reversible, low-impact changes that mirror the implementation.
</autonomy_policy>
```

스킬별 적용 (그릴 2026-09-11 확정): **rescue만**. `--write`는 전문, read-only는 1·3행(보고형 + follow-through). verify/research에는 넣지 않음 — 읽기 전용 sandbox라 승인 경계 무관, 기존 블록이 이미 1회 지시. 이 초안은 세션 산출물이며 실측 전 — 그릴에서 문구 단위로 검토한다.

블록마다 출처 주석을 남긴다: `<!-- source: OpenAI "Using GPT-5.6" §Define autonomy and approval boundaries; "Using GPT-6 Astra" §Initiative and follow-through, §Testing and verification (2026-09-11) -->`. 이것이 ADR 0004가 요구한 provenance note의 지불이다. 기존 `gpt-5-4-prompting` 출처 주석은 유지된 블록에만 남긴다.

왜 되는가: 5.6 가이드는 lean prompt로 내부 eval 10~15%↑·토큰 41~66%↓를 보고했고, "ask first 반복 = 불필요한 승인 요청"을 명시했다. 위키 `openai-model-guidance-gpt56`이 이를 `principles-over-demonstrations`·`nick-nisi`와 수렴 기록. `approvalPolicy=never` 경로에서 되묻기가 곧 실패라는 건 companion 코드로 확인된 사실이다.

### D3 — ③ 읽기 독립성: double-check를 fresh 서브에이전트로

대상 스킬: `codex-review`, `codex-adversarial`, `codex-rescue`, `codex-verify`, `codex-research` — Phase 4가 있는 다섯.

**구조**:
1. Phase 3 완료 후 메인 Claude는 Codex 출력 JSON을 파싱만 한다. finding 목록을 뽑는다. 소스는 여전히 안 읽는다.
2. **인용 존재 검사(스크립트, 결정론)**: 각 finding의 인용(file, line 범위)에 대해 파일 존재·줄 범위 유효를 판정해 JSON으로 돌려준다. 인용이 없으면 `uncited`. 존재하지 않으면 `missing`. 이것이 Five-way의 **False Positive / Uncited** 판정을 코드로 옮긴 것이다. 위키 `evidence-gates`: fact는 코드, judgment는 AI.
3. **판정 서브에이전트(finding당 1개, 병렬)**: 플러그인 `agents/`에 정의. 입력은 (a) finding 원문, (b) 인용 file:line, (c) 존재 검사 결과, (d) 분류 규칙(`evaluation.md` 참조). 허용 도구는 Read(인용 줄 ± 소량 컨텍스트)·Grep(인용 심볼 확인)만. 출력은 `{classification: Agreed|Disputed|Nuanced, evidence, reason}` JSON 한 개. finding당 분리인 이유: `references/compound-engineering-plugin/ce-code-review` — "묶어서 보면 패턴매칭으로 편향 재발".
4. 메인 Claude는 JSON을 모아 Agreement 요약과 보고서를 쓴다. 판정은 안 바꾼다. 보고서에 `Verifier: fresh subagent (N groups)` 라벨.
5. **열화 모드**: Agent 도구가 없거나 실패하면(headless) 메인이 기존 Phase 4를 수행하되 보고서에 `Self-verified — independent sub-task unavailable` 라벨. 출처: `references/gstack/cso` 동일 fallback.

rescue `--write`: 판정 대상이 finding이 아니라 diff. 서브에이전트 입력 = 유저 task 원문(스펙이지 가설이 아님) + `git diff` 출력. 출력 = 과제 충족 여부·범위 이탈·부작용. 메인은 안 읽는다. 서브에이전트는 diff 주변(변경된 함수·호출처)을 Read·Grep으로 볼 수 있음 — 다른 스킬 판정자와 동일 도구. 리포 전체 탐색 금지 (그릴 2026-09-11).

verify/research: 판정 대상이 Codex의 verdict/리서치 결과이고 blind payload로 문서 원문이 메인에 없다. 서브에이전트는 문서 + Codex 결과를 받아 분류한다. **인용 존재 스크립트는 안 씀** (그릴 2026-09-11): 스크립트는 `file:line` 인용하는 review/adversarial/rescue 3개만. verify는 문서 하나가 입력 전부라 서브에이전트가 헤맬 공간이 없고, 섹션 인용 형태("§3.2"/"Rollback 절"/본문 인용)가 비정형이라 grep 규칙은 유지비만 생김. research는 URL 검증 = 네트워크라 스크립트 범위 밖. 두 스킬은 서브에이전트가 인용 확인까지 같이 함(SOFT — 입력이 유한해 감수). 이 두 스킬은 이미 구조적으로 독립이었으므로 이득은 "규칙이 다섯 스킬에서 같아진다"는 일관성이다.

**PreToolUse 훅은 만들지 않는다.** 서브에이전트에는 막을 히스토리가 없다. 열화 모드에서 메인이 읽는 건 어차피 허용된 Phase 4 행동이다. 훅이 필요해지는 건 "메인이 Phase 1~3에서 읽는" 경우뿐인데, 그건 이 구조에서 메인이 Phase 4 자체를 안 하므로 동기가 사라진다. 그릴 2026-09-11 재검토 → **확정: 훅 없음**. 판정은 서브에이전트가 하므로 메인이 Phase 1~3에 읽어도 판정 불변, 메인 역할은 JSON 집계뿐. 훅은 Phase 경계를 알 수 없어 구현도 불명확.

**판정 서브에이전트 프롬프트 3원칙** (그릴 2026-09-11 확정 — 문구는 이슈 슬라이스에서 `validator-template.md` 기반으로 작성): (1) 기본 판정은 Disputed — 의심되면 reject. (2) 원 finding에 commitment 없음 — Codex 편도 안 듦. (3) 출력은 JSON만, 설명은 evidence 필드에. 근거: Anthropic L31 "분리만으론 관대함이 안 사라짐, 회의적 튜닝 필요".

**묶음 규칙** (그릴 2026-09-11 확정): 기본 finding당 서브에이전트 1개, 상한 없음. 단 인용 존재 검사 스크립트가 **같은 파일 + 줄 범위 겹침**인 finding에 같은 `group_id`를 부여하고, 한 group = 서브에이전트 1개. 묶음 판단은 스크립트만 — 메인 Claude 재량 묶기는 기각(편향 당사자가 희석 통로를 쥠, `deterministic-over-clever`). 토큰은 단일 처리보다 늘지만(프리픽스 N회, 캐시 히트) 병렬이라 지연은 동일. 실측 후 상한 재검토.

**크기 임계 없음** (그릴 2026-09-11): finding 1개여도 서브에이전트. "작으면 메인이 직접"은 편향 예외를 다시 여는 것. 비용은 finding 수에 비례하므로 별도 임계 불필요.

**서브에이전트 모델**: **상속** (그릴 2026-09-11 확정). agent 정의에 `model:` 안 박음 — 박으면 모델 지식이 플러그인에 들어와 스펙 012 위반. 위키 `loops-explained-kopadze` "reviewer는 느리고 엄격하게"는 프롬프트 3원칙으로 충족.

왜 되는가: 위키 `verification-layers` L122 "검증은 항상 별개 인스턴스"; Anthropic 원문 L31 "일하는 에이전트와 판단하는 에이전트를 분리하는 게 강한 지렛대"; 같은 글 L135 "Claude는 문제를 찾고도 별거 아니라고 스스로 넘긴다" — 이게 지금 우리 메인 Claude의 Phase 4다. 서브에이전트는 그 코드를 쓴 적이 없으므로 옹호할 것이 없다.

### D4 — `spark` 별칭 삭제

`apply-codex-config.py`의 `MODEL_ALIASES`와 README·SKILL.md의 spark 언급 삭제. 스펙 012 D2가 "유지"로 남긴 유일한 모델 지식이며, 그때 근거는 "companion과 동일 별칭"이었다. 지금은 가리키는 모델이 캐시에 없다. 유저가 `spark`를 치면 그대로 config.toml에 쓰이고 Codex가 거부한다 — 012의 "판정하지 않는다" 원칙과 같은 결과.

### D5 — 용어집·문서 갱신

`docs/context/codex-advisor.md`:
- **Companion** 항목에 호출 프로토콜 명시: `codex app-server` JSON-RPC over stdio(`thread/start` → `review/start` | `turn/start`), `codex exec` 아님. AGENTS.md 로딩은 Codex 코어 동작이며 companion은 관여하지 않음(Astra 가이드가 AGENTS.md 민감도 상승을 명시 — 실측은 Out of Scope).
- 3층 모듈 경계 표(우리 / Official companion / Codex CLI)와 프롬프트 소유권 표(review=Codex 서버, adversarial=Official prompts, task=우리).
- **Double-check independence** 항목을 read-side / write-side 둘로 분리하고 판정자(fresh subagent)와 열화 모드 라벨 추가.
- **Vendored prompt blocks**·**Provenance debt** 항목을 D2 이후 상태로 갱신(출처가 5.4 가이드 → 5.6/Astra 가이드).
- **Five-way classification**에 "False Positive/Uncited는 스크립트 판정, 나머지 셋은 서브에이전트 판정" 추가.

README: "How a call is translated" 4단계 double-check 설명을 판정자 구조로 갱신. `plugin.json`·`marketplace.json` description에 "fresh-context double-check" 반영.

### D6 — 버전

4.7.1 → **4.8.0**. minor: 유저가 보는 프리뷰·보고서 형식이 바뀌고 double-check 실행 주체가 바뀐다. 명령 표면·플래그는 동일.

## Testing Decisions

좋은 테스트 = 외부 관측 가능한 산출물만 본다. SKILL.md 문구나 Claude의 중간 추론은 안 본다.

### Seam

가장 높은 단일 seam은 "스킬 한 번 실행 → 저장된 보고서 파일". 그러나 Codex 실행이 필요해 비싸고 비결정적이다. 그래서 각 처방이 만드는 **결정론적 산출물**을 seam으로 잡는다.

| 처방 | Seam(관측 지점) | 결정론 |
|---|---|---|
| ① | Phase 1.5 프리뷰 텍스트의 "보냄 / 제외됨(가설)" 두 칸, 그리고 실제 PROMPT_FILE / focus 인자 | 부분 — 분류는 LM. 사례 고정 입력 5개로 골든 비교 |
| ② | PROMPT_FILE 내용(verify/research는 완전 고정 템플릿) | 예 — 골든 파일과 diff |
| ③-a | 인용 존재 검사 스크립트: fixture Codex JSON → 존재/누락/미인용 JSON | 예 — 단위 테스트 |
| ③-b | 판정 서브에이전트: fixture finding + fixture 파일 → 분류 JSON | 부분 — 스키마 검증 + 명백 사례(존재하지 않는 함수 인용 → 서브에이전트가 Agreed를 내면 실패) |
| ③-c | 보고서의 `Verifier:` 라벨 | 예 |
| D4 | `apply-codex-config.py spark ""` → config.toml에 `spark` 그대로 | 예 |

새 seam은 ③-a 스크립트와 ③-b 에이전트 입출력 계약 둘. 기존 seam(PROMPT_FILE, 보고서 파일, apply-codex-config stdout)을 우선 쓴다.

### 선례 (prior art)

- 스펙 012 Testing Decisions: `apply-codex-config.py` stdout 한 줄을 seam으로 잡은 방식 — D4와 동일.
- worktree-plus 이슈 011의 headless 쓰기 검증 기법(메모리 `project_worktree_plus_setup_skill`): `claude -p --plugin-dir`로 스킬을 돌리고 파일 산출물을 검사. ②의 PROMPT_FILE 골든 비교에 그대로 쓴다.
- `references/compound-engineering-plugin/ce-code-review/references/validator-template.md`: 판정자 출력 `{"validated": bool, "reason"}` JSON 계약 — ③-b 스키마의 선례.

### 무엇을 관측하나

- ① 가설 문장이 포함된 입력 5개에 대해 PROMPT_FILE/focus 인자에 그 문장이 없고 프리뷰 "제외됨"에 있는가.
- ② verify/research PROMPT_FILE이 골든과 일치하는가. rescue `--write`와 read-only의 블록 집합이 D2 표와 일치하는가.
- ③ 존재하지 않는 file:line을 인용한 fixture finding이 최종 보고서에서 False Positive로 분류되는가. 존재하는 인용은 서브에이전트 JSON이 스키마를 만족하는가. headless에서 `Self-verified` 라벨이 붙는가.
- D4 `spark`가 확장되지 않는가.

## Out of Scope

- Native path(review / adversarial)의 Codex 쪽 프롬프트. ADR 0004대로 불가침.
- Official 플러그인 포크·병합. 이 세션에서 검토 후 기각 — 프롬프트 최신화는 병합 없이 가능하고, 병합은 companion 5,469줄 + 테스트 3,715줄의 유지 부채만 더한다.
- PreToolUse 훅으로 Phase 1~3 읽기 차단. D3 구조에서 동기 소멸(재검토는 그릴에서).
- AGENTS.md가 companion 경유 Codex 스레드에 실제 로드되는지 실측. Codex 문서상 로드되며 companion은 관여하지 않는다. 별도 E2E 1회로 확인 가능하나 이 스펙의 변경과 독립.
- 하용호식 N개 병렬·2회 반복 검증. finding당 1개로 시작. 확장은 데이터 보고.
- `references/codex-plugin-cc` 업스트림 추적 자동화. 업스트림 자체가 2026-07-07 이후 정지.
- Astra 가이드의 slop-word·subagent delegation·instruction priority 절. task path 출력은 JSON 스키마, 서브에이전트 없음 — 무관.

## Further Notes

### 왜 이 셋이 한 스펙인가

셋 다 같은 한 문장에서 나온다: *검수자는 피검수자의 생각을 몰라야 한다.* ①은 Codex가 Claude의 생각을 모르게, ③은 판정자가 Claude의 생각을 모르게, ②는 Codex가 우리 프롬프트 때문에 멈추지 않게. ②만 독립성이 아니라 품질 축이지만 같은 파일(verify/research/rescue SKILL.md)의 같은 블록을 건드리므로 분리하면 두 번 만진다.

### ADR 후보

③은 ADR 세 조건을 만족할 가능성이 높다. 되돌리기 어렵고(다섯 스킬의 Phase 4 구조), 나중 독자가 "왜 메인이 직접 안 하고 서브에이전트를 띄우나"를 물을 것이며, 대안(훅 강제 / 지시문 강화 / 현행 유지)이 실제로 있었다. 그릴에서 ③이 확정되면 ADR 0012 "double-check runs in a fresh subagent; enforcement by structure, not instruction"을 쓴다. ①②는 ADR 불필요 — 되돌리기 쉽다.

### 이 세션에서 기각한 것

- **Official 플러그인 병합**: 위 Out of Scope.
- **`spark` 유지**: 무해하지만 "우리는 모델을 모른다"(012)와 모순.
- **블록을 5.6 가이드만으로 정리**: Astra가 되묻기 성향이 더 강해 follow-through 문구가 필요. 둘을 합친다.
- **③을 지시문 강화로**: 위키 `evidence-gates` "AI가 강제하면 SOFT". 호출 전 오염(코드를 쓴 당사자)은 어떤 지시문으로도 못 지운다.

---

## 그릴 가이드 (다음 세션용)

각 처방에 대해 **무엇을 바꾸나 / 메커니즘 / 왜 되나 / 반박 포인트**를 적었다. 그릴은 반박 포인트에서 시작한다.

### ① 쓰기 독립성

- **무엇**: adversarial focus text·rescue task text에서 가설을 걸러내고 프리뷰에 표시.
- **메커니즘**: Phase 1 ANALYZE의 토큰 분류에 evidence/focus/hypothesis 축 추가. hypothesis는 companion으로 안 나감. 프리뷰가 제외분을 노출.
- **왜 되나**: 검수자에게 답을 주면 검수자는 답을 확인한다(anchoring). 위키 `dynamic-workflows-cc` "disjoint evidence", references gstack "경로와 줄 번호만". Codex가 다른 모델이어도 입력이 결론을 담으면 self-evaluation과 같다.
- **반박 포인트**: (a) focus와 hypothesis 경계가 LM 판단이라 비결정적 — 이걸 프리뷰 사람 게이트로 받는 게 충분한가. (b) 유저가 일부러 가설을 주고 "이거 맞나 반박해봐"를 원하는 경우 — 그건 초점인가 가설인가. (c) rescue는 검수가 아니라 위임인데 왜 가설을 빼나 — 위임 텍스트에 원인 추정이 있으면 Codex는 그 원인만 고친다.

### ② 블록 정리

- **무엇**: `completeness_contract`·`verification_loop`·`action_safety` → `autonomy_policy` 한 블록. verify/research는 보고형 2행, rescue `--write`는 전문.
- **메커니즘**: task path 프롬프트는 우리가 100% 소유(ADR 0004). heredoc 템플릿의 블록 문구를 교체할 뿐 companion·Codex 쪽 변경 없음.
- **왜 되나**: 5.6 가이드 lean prompt 정량(내부 eval +10~15%, 토큰 −41~66%) + "ask first 반복 → 승인 노이즈". Astra 가이드 "되묻기 성향 증가 → bias towards action 문구 필요". `approvalPolicy=never`에서 되묻기 = 턴 종료는 companion 코드 사실.
- **반박 포인트**: (a) OpenAI 정량은 시스템 프롬프트 기준이고 우리는 단발 task 프롬프트 — 전이되나. (b) verify에서 "끝까지 검토하라"(`completeness_contract`)를 빼면 긴 문서 검토가 중간에 끝나지 않나 — Astra는 오히려 과잉 완수 성향인데 5.6-luna는? 모델별 차이를 한 블록으로 덮을 수 있나. (c) 5.6 가이드는 "측정하며 하나씩 빼라"고 했는데 우리는 eval이 없다 — 골든 비교는 형식 검증이지 품질 검증이 아니다.

### ③ fresh 서브에이전트 double-check

- **무엇**: Phase 4를 메인에서 떼어 finding당 서브에이전트 1개 + 인용 존재 스크립트로 분리. 열화 모드 라벨.
- **메커니즘**: 메인은 Codex JSON 파싱·집계·보고만. 스크립트가 fact(존재)를 판정, 서브에이전트가 judgment(Agreed/Disputed/Nuanced)를 판정. 서브에이전트 입력은 finding + 인용 + 규칙뿐이라 세션 히스토리·작성 이력이 물리적으로 없음.
- **왜 되나**: 지시("읽지 마라")는 호출 전 오염을 못 지운다 — 메인은 이미 그 코드를 쓴 당사자. 별개 인스턴스는 옹호할 자기 작업이 없다(위키 `verification-layers` L122·L128, Anthropic L31·L135). fact를 코드로 빼는 건 `evidence-gates` "fact는 코드, judgment는 AI". finding당 분리는 ce-code-review "묶으면 편향 재발".
- **반박 포인트**: (a) 서브에이전트도 같은 모델(Claude) — self-preferential bias가 "자기 세션"이 아니라 "자기 모델" 수준이면 효과가 얼마나 남나. Anthropic L31: 분리만으론 관대함이 안 사라지고 **회의적 튜닝**이 필요 — 그럼 서브에이전트 프롬프트의 skeptic 강도가 핵심인데 초안이 없다. (b) finding당 1개면 finding 10개에 서브에이전트 10개 — 비용·지연이 review 1회당 감당되나. 묶음 크기 상한이 필요한가. (c) rescue `--write`에서 서브에이전트가 diff만 보고 "과제 충족"을 판단할 수 있나 — 리포 컨텍스트 없이. (d) 훅을 안 만든다는 결정 — 열화 모드(headless)에서 메인이 Phase 1~3에 읽는 걸 여전히 아무도 안 막는다. (e) Anthropic L152 "evaluator는 모델이 혼자 못 하는 경계 밖 작업에서만 가치" — 작은 diff에서는 서브에이전트가 순수 오버헤드. 크기 임계값을 둘 것인가.

---

## 핸드오프 (다음 세션용 — 스펙 본문에 없는 세션 사실만)

> 작성 2026-09-11. 다음 세션 목표: 위 §그릴 가이드로 ①②③ 확정 → 이슈 016 슬라이스. 구현은 그 다음.

### 읽는 순서

1. 이 스펙 §그릴 가이드 반박 포인트 → 2. `docs/context/codex-advisor.md`(용어) → 3. ADR 0004(전제, 재논쟁 X) → 4. 스펙 012("모델 지식 0") → 5. 메모리 `project_codex_advisor_016.md`.

### 위치·환경 사실

- **llm-wiki**: `/Users/ljo/Desktop/project/zero-code/llm-wiki/wiki/` (이 레포 밖). 유저의 "우리 wiki"는 이것, `docs/` 아님. 진입점 `index.md`. 쓴 페이지: `concepts/verification-layers.md`(L122~128 self-preferential bias, 하용호 N개 병렬 프롬프트), `concepts/evidence-gates.md`(fact=코드/judgment=AI, "강제는 AI 손 밖"), `comparisons/evidence-gates-sources.md`(축 3 검증자=누구), `summaries/dynamic-workflows-cc.md`(L64 disjoint evidence), `summaries/loops-explained-kopadze.md`(maker≠checker), `summaries/openai-model-guidance-gpt56.md`(5.6 가이드 요약, 2026-07-12 작성).
- **OpenAI 가이드 원문**: `developers.openai.com/api/docs/guides/latest-model/gpt-5.6.md`, `.../latest-model.md`(= gpt-6-astra). URL 끝 `.md`로 마크다운 수령. sol/luna/terra 개별 페이지 없음. 세션 사본은 소멸 — 재수령.
- **실측(2026-09-11)**: Official `codex@openai-codex` 설치본 1.0.6 = `references/codex-plugin-cc` HEAD = upstream `db52e28`(2026-07-07, 이후 정지). codex-cli 0.154.0. `~/.codex/config.toml` = `gpt-5.6-luna`/`max`. `~/.codex/models_cache.json`(당일): gpt-6-astra, gpt-5.6-sol/terra/luna, gpt-5.5. `gpt-5.3-codex-spark` 없음.
- **companion 호출**: `lib/app-server.mjs:190` `spawn("codex",["app-server"])` → `thread/start`(sandbox read-only, approvalPolicy never, ephemeral) → `review/start` | `turn/start`. AGENTS.md 언급 0줄.
- **references vendor 후보(③ 판정자 프롬프트)**: `references/compound-engineering-plugin/skills/ce-code-review/references/validator-template.md`(1순위: "원 finding에 commitment 없음, 의심되면 reject, JSON만"), `references/gstack/cso/SKILL.md:1037`(경로·줄만), `references/harness-kit/.claude/skills/dk-close-the-loop/SKILL.md:159`(가설 안 보여줌), `references/superpowers/skills/subagent-driven-development/task-reviewer-prompt.md`(보고서=미검증 주장).

### 미확인

- 유저가 인용한 문장 "자기 비판보다 신선한 컨텍스트를 가진 검증자 서브에이전트가 더 낫다. 긴 작업에는 다음처럼 지시합니다" — 5.6·Astra 페이지에 없음. 출처 주소 요청했으나 미답. ③ skeptic 프롬프트 초안 재료일 수 있음 → **첫 질문 후보.**

### 기각됨 (재제기 금지)

Official 플러그인 포크/병합 · `spark` 유지 · ②를 5.6만으로 · ③을 지시문 강화로. 사유는 §Further Notes.

### 그릴 순서 제안

③(a) 같은 모델 서브에이전트 편향 잔존 + skeptic 프롬프트 초안 부재 → ③(b) finding당 1개 비용 상한 → ①(a)(b) focus/hypothesis 경계 → ②(b) 모델별 차이 → seam 확인(Testing Decisions 표, 신규 seam 둘) → 이슈 016 슬라이스 → ③ 확정 시 ADR 0012 제안(작성은 유저 OK 후).

### 유저 작업 방식 (이 세션 지시)

질문은 **한 번에 하나**. 장황 금지 — 답 먼저, 근거는 표 하나. 한국어(코드·커밋은 영어). 그릴 중 코드 편집 X, 문서에 반영. 조사 보고 ≠ 승인.

### Suggested skills

`grilling` + `domain-modeling`(`/grill-with-docs`; 용어집 D5는 확정 즉시 인라인) → 이슈 후 `writing-for-agents`(SKILL.md·agents 편집) → 구현 시 `skill-creator-pro`. `research`는 AGENTS.md 실측을 하기로 할 때만.

### 파일 상태

신규 미커밋: 이 스펙, 메모리 `project_codex_advisor_016.md` + `MEMORY.md` 1줄. 코드 변경 0, 커밋 0. `docs/specs/015-*.md`의 M은 이 세션 이전 것 — 건드리지 말 것.
