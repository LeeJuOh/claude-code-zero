# Spec 016 — codex-advisor: 검수자 독립성 복원 (쓰기 독립 · 블록 정리 · fresh 서브에이전트 double-check)

> 생성: 2026-09-11 · 출처: grill-with-docs 세션 (codex-advisor 아키텍처 점검 → 독립성 누수 3곳 발견)
> 구현 이슈: `docs/issues/016-codex-advisor-independence.md` (S1~S6, 2026-09-11 그릴 완료 후 작성). ADR 0012 작성됨. 그릴 확정 사항은 D1~D3에 "그릴 2026-09-11" 표기로 인라인. 최종 검수(이슈 F1~F9·I1~I3·N1·N2) 결정 반영 2026-09-14.
> 대상 플러그인: `plugins/codex-advisor/` (현재 v4.7.1 → v5.0.0, major: `--no-preview`·verify/research `resume` 삭제로 기존 호출이 깨짐)
> 용어집: `docs/context/codex-advisor.md` — **Double-check independence**, **Vendored prompt blocks**, **Six-way classification**(구 Five-way), **Provenance debt** 절이 대상.
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

**② 프롬프트 블록 부채.** task path의 XML 블록은 Official 플러그인의 `gpt-5-4-prompting` 가이드에서 설계 시점에 복사한 것이다(vendored). 지금 모델은 GPT-5.6 계열, 곧 GPT-6 Astra. OpenAI 5.6 가이드는 "지시는 한 번만, 'ask first'류 반복은 불필요한 승인 요청을 유발한다"고 벤더 eval 수치와 함께 말한다. 우리 블록은 `completeness_contract` + `verification_loop` + `action_safety` 세 개가 비슷한 말을 반복하고, `action_safety`의 "위험하면 먼저 알려라"는 task path에서 되묻기 = 작업 미완인데 성공 보고로 이어진다(원인은 D2, 그릴 2026-09-14 교정). Astra 가이드는 이전 모델보다 되묻는 성향이 강하다고 명시해 이 위험을 키운다.

**③ 읽기 쪽 누수 — 가장 큼.** "Codex 결과 전엔 소스를 읽지 마라"는 north star가 실제로 안 지켜진다. 이유 둘: (a) 지시문일 뿐 강제가 없다(hooks.json에 SessionStart 하나뿐). (b) 더 근본적으로, 스킬 호출 시점에 메인 Claude는 이미 그 코드를 **쓴 당사자**다. 안 읽어도 컨텍스트에 다 있다. `evaluation.md`의 "Self-Bias Awareness: 내가 쓴 코드면 인정해라"는 이 상황의 고백이지 해결이 아니다. 위키 원문: *"실제 작업하던 세션에 '검증도 해봐' 하면 매우 일부분만 잡아낸다."*

부수 잔재 하나: `spark` → `gpt-5.3-codex-spark` 별칭이 오늘 모델 캐시에 없는 모델을 가리킨다. 스펙 012가 남긴 유일한 모델 지식이다.

## Solution

독립성을 세 지점 모두에서 **구조로** 복원한다. 지시가 아니라 구조인 이유는 위키 `evidence-gates`의 원리 그대로다: *"강제는 무조건 AI 손 밖. AI가 강제하면 SOFT."*

- **① 쓰기 독립성**: Codex로 나가는 문구는 **증거만** 담는다 — 범위, 증상, 재현 조건, 유저 원문. 가설·원인 추정·의심 파일·기대 답은 제외. Phase 1.5 프리뷰가 제외분을 보여주고 사람이 확인한다.
- **② 블록 정리**: 세 블록을 5.6 가이드 구조(보고형 / 변경형 / 확인 필요형 3구간) + Astra follow-through 문구를 합친 **autonomy policy 한 블록**으로 교체. 지시는 한 번만.
- **③ 읽기 독립성**: Phase 4 double-check를 메인 Claude가 아니라 **fresh 서브에이전트**가 한다. 서브에이전트는 히스토리가 없으므로 "읽지 마라"가 필요 없다. 입력은 Codex finding 하나 + 인용 file:line + 분류 규칙뿐. 인용 존재 여부(False Positive의 fact 부분)는 스크립트가 먼저 판정한다.
- 부수: `spark` 별칭 삭제. 용어집에 app-server 프로토콜·모듈 경계·이 스펙의 세 원칙 반영.

유저가 보게 될 것: 명령 표면은 그대로. 프리뷰에 "제외됨(가설)" 항목이 생기고, double-check 보고에 "판정자: fresh subagent"가 붙고, Verifier 실행에 실패한 finding은 `Unverified`로 표시된다(메인이 대신 판정하지 않음 — 그릴 2026-09-14, 이슈 Q6).

## User Stories

1. As a codex-advisor 유저, I want Claude가 `/codex-adversarial`에 자기 가설을 실어 보내지 않기를, so that Codex가 Claude의 결론을 확인하는 대신 독립적으로 본다.
2. As a codex-advisor 유저, I want 프리뷰에서 "보내는 것 / 제외한 것(가설)"을 나눠 보기를, so that 제외가 과했으면 그 자리에서 되돌릴 수 있다.
3. As a codex-advisor 유저, I want focus 범위("login handler 쪽 봐줘")는 남고 원인 주장("null check 누락으로 auth bypass")만 빠지기를, so that 초점은 주되 답은 안 준다.
4. As a codex-advisor 유저, I want `/codex-rescue` task 텍스트에 유저 원문이 verbatim 남기를, so that 스펙 004의 "유저 말은 안 바꾼다" 계약이 유지된다.
5. As a codex-advisor 유저, I want rescue `--write` 실행이 되묻고 멈추지 않기를, so that 답할 상대가 없는 질문으로 턴이 끝나 작업 미완이 성공으로 보고되지 않는다.
6. As a codex-advisor 유저, I want 작은 수정에 Codex가 과잉 테스트를 안 쓰기를, so that rescue 결과 diff가 요청 범위에 머문다.
7. As a codex-advisor 유저, I want verify/research 프롬프트가 더 짧기를, so that 5.6 계열에서 같은 품질을 더 적은 토큰으로 얻는다.
8. As a codex-advisor 유저, I want double-check가 내가 방금 Claude와 같이 쓴 코드에 대해서도 엄격하기를, so that "별거 아니네"로 넘어가는 finding이 없다.
9. As a codex-advisor 유저, I want double-check 판정자가 finding과 인용 줄만 보기를, so that 세션 히스토리가 판정에 스며들지 않는다.
10. As a codex-advisor 유저, I want 인용된 파일·줄이 존재하는지는 스크립트가 판정하기를, so that False Positive 분류가 모델 기분이 아니라 사실이다.
11. As a codex-advisor 유저, I want 보고서에 finding마다 판정자(Verifier)가 실제로 판정했는지, 아니면 실행 실패로 `Unverified`인지 표시되기를, so that 검수 안 된 결과를 검수된 결과로 오해하지 않는다.
12. As a headless(`claude -p`) 유저, I want Verifier 호출이 실패해도 스킬이 죽지 않고 해당 finding을 `Unverified`로 적은 보고서를 내기를, so that 자동화 파이프라인이 끊기지 않는다. (그릴 2026-09-14 수정: 원문 "self-verify로 내려가기" — headless에서도 서브에이전트는 정상 동작하므로 전제가 틀렸고, 메인 self-verify는 폐지)
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

Phase 1.5 프리뷰(adversarial·rescue 둘 다 이미 있음)에 "제외됨(가설)" 항목 추가. 유저가 "Needs changes"로 되돌릴 수 있다. **출처를 가리지 않는다** (그릴 2026-09-14 확정, 이슈 Q11): 유저가 슬래시 명령을 직접 쳤든 Claude가 의도를 읽어 대신 호출했든 규칙은 똑같이 적용된다 — 가설은 항상 제외분으로 프리뷰에 보이고, 유저가 넣겠다면 "제외된 것 넣기" 한 번으로 복구한다. 초안의 "유저 원문은 가설이 있어도 verbatim" 예외는 삭제 — 그 예외는 "누가 쳤는가" 판별 계약을 요구하는데(2차 검수 지적) 안정적인 판별 신호가 없고, Claude 자체 호출(최대 누수 경로)이 유저 원문으로 오인되면 규칙이 통째로 빠진다. 프리뷰는 어차피 항상 뜨므로(`--no-preview` 삭제) 유저 비용은 확인 한 번. 검토 후 기각: 유저 마지막 메시지의 슬래시 명령 유무로 판별 — 직접 호출과 Claude 호출의 동작이 갈라져 유저가 예측하기 어렵다(유저 지적). rescue의 task 원문은 요구사항 자체이므로 증거이지 가설이 아니다 — 스토리 4의 verbatim은 그대로 성립한다.

**`--no-preview` 플래그 삭제** (그릴 2026-09-11 결정). 4개 스킬 모두 항상 프리뷰. 이유: 분류는 Claude 판단(SOFT)이라 프리뷰 사람 확인이 유일한 검사 창인데, 플래그가 그 창을 우회한다. **보장 범위** (그릴 2026-09-14, 이슈 F9+N1): 프리뷰는 사람이 답했을 때만 확인이다. 유저가 켠 `askUserQuestionTimeout`으로 질문이 닫히거나, `claude -p`에서 질문 도구가 제공되지 않으면(N1, 미실측) 확인 없이 진행될 수 있다 — 수용한 한계, 코드로 막지 않는다. 초안의 "headless는 Phase 1.5에서 멈춘다"는 N1과 어긋날 수 있어 이 문장으로 교체. (그릴 2026-09-14 재확인, 이슈 Q7: 삭제 취소 안을 검토 — 자동 테스트는 되지만 Claude 자체 호출이 플래그로 검사 창을 건너뛸 길이 남아 기각. 검증은 수동 실행으로 한다 — 이슈 §검증 방법. 종료 코드 정정: 초안의 "§9 규칙대로 exit 1"은 틀림 — `companion-usage.md` §9의 Bash `exit 1`은 그 Bash 도구 호출의 실패이지 부모 `claude -p`의 종료 코드가 아니다. 스킬 지시로는 부모 종료 코드를 정할 수 없고, 정할 필요도 없다.) User Story 12는 ③ Verifier 실행 실패에만 해당.

**verify·research의 `resume` 키워드 삭제** (그릴 2026-09-13 확정, 이슈 Q13). 두 스킬의 `resume [follow-up]` 키워드는 `--resume-last`로 이전 Codex 스레드를 잇는다. 문제 둘: (1) 이전 턴에 보낸 가설이 스레드에 남아 ①이 무력. (2) `--resume-last`는 스킬 구분 없이 세션의 최근 task job을 고르므로, rescue로 코드 짠 스레드가 verify `resume`으로 자기 코드를 검수한다(maker = checker). 검수에서 "이어서"는 독립성과 정의상 충돌하므로 키워드를 없앤다 — 후속 질문은 새 호출(새 스레드)로 한다. rescue의 `--resume-last`/`--resume`/`--fresh`는 companion 공식 `task` 플래그이고 구현 이어가기는 정상 사용이라 그대로. 기각: (B) 유지 + `Continued thread — not an independent review` 라벨 — 라벨 코드가 늘고 독립 아닌 검수를 계속 제공할 이유가 없음. (A) rescue까지 삭제 — 검수와 무관.

**그릴에서 기각** (2026-09-11): (a) 정규식 스크립트로 가설 감지 — `file:line`·단정어는 형태만 잡고 자연어 가설은 놓침, 유저가 정당하게 준 위치도 오탐. 판단 자체를 코드로 못 옮김. (b) Claude 변형 금지(유저 원문 verbatim만) — 유저는 Claude가 의도를 읽어 알맞은 focus를 써주길 원함. (c) 분류를 fresh 서브에이전트가 — ③ 결과 본 뒤 필요하면 재검토. (d) 유저 직접 호출 / Claude 호출 판별 계약(2026-09-14, Q11) — 위 "출처를 가리지 않는다"로 대체.

**방어선 구조**: 1(지시문)이 유일한 방어선. 2(프리뷰 `Excluded (hypothesis):`)는 1이 틀렸을 때 보이게 하는 검사 창. 3(`--no-preview` 삭제)은 플래그로 검사 창을 건너뛰는 경로 제거 — 사람이 답하지 않고 넘어가는 경우는 위 보장 범위대로 한계.

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
Do not perform external writes, destructive actions, or scope expansions the task did not ask for; list them in the final report instead. What the task itself asks for is already approved.
Never end with a question — no one can answer it.
Do not write tests for reversible, low-impact changes that mirror the implementation.
</autonomy_policy>
```

스킬별 적용 (그릴 2026-09-11 확정): **rescue만**. `--write`는 전문, read-only는 1·3행(보고형 + follow-through). verify/research에는 넣지 않음 — 읽기 전용 sandbox라 승인 경계 무관, 기존 블록이 이미 1회 지시. 이 초안은 세션 산출물이며 실측 전 — 그릴에서 문구 단위로 검토한다.

블록마다 출처 주석을 남긴다: `<!-- source: OpenAI "Using GPT-5.6" §Define autonomy and approval boundaries; "Using GPT-6 Astra" §Initiative and follow-through, §Testing and verification (2026-09-11) -->`. 이것이 ADR 0004가 요구한 provenance note의 지불이다. 기존 `gpt-5-4-prompting` 출처 주석은 유지된 블록에만 남긴다.

왜 되는가: 5.6 가이드는 lean prompt로 내부 eval 10~15%↑·토큰 41~66%↓를 보고했고, "ask first 반복 = 불필요한 승인 요청"을 명시했다. 위키 `openai-model-guidance-gpt56`이 이를 `principles-over-demonstrations`·`nick-nisi`와 수렴 기록. task path에서 되묻기가 곧 실패다 — Codex의 질문에 답할 상대가 없기 때문(companion은 서버 요청을 전부 `-32601`로 거절, `lib/app-server.mjs:155-160`)이고, 질문으로 끝난 턴도 `finalTurn.status === "completed"`라 성공으로 집계된다(`lib/codex.mjs:754`) — 작업 미완인데 상태는 성공. (그릴 2026-09-14 확정, 이슈 Q10 — 2차 검수 교정: `approvalPolicy=never`가 질문을 종료시키는 게 아니다.) 문구 교정 (같은 그릴, Q10): 초안 4행 `Require confirmation only for …`는 바로 그 되묻기를 지시하므로 위 블록처럼 교체 — 시키지 않은 외부 쓰기·파괴적 행동·범위 확장은 하지 않고 보고에 적되, **task 원문이 명시한 것은 승인된 것**으로 실행, 질문으로 끝내지 않는다. 기각: "그 행동은 하지 않고 보고에 적는다"만 — 유저가 시킨 파괴적 행동(예: 파일 삭제 요청)까지 보류시킨다.

### D3 — ③ 읽기 독립성: double-check를 fresh 서브에이전트로

대상 스킬: `codex-review`, `codex-adversarial`, `codex-rescue`, `codex-verify`, `codex-research` — Phase 4가 있는 다섯.

**구조**:
1. Phase 3 완료 후 메인 Claude는 Codex 출력 파일을 스크립트에 넘길 뿐, finding 목록을 직접 뽑지 않는다. 소스는 여전히 안 읽는다. **finding 추출 주체** (그릴 2026-09-12 확정, 이슈 Q1): 규칙은 "출력 틀이 코드로 고정돼 있으면 스크립트가 자르고, 아니면 아무도 안 자른다". adversarial은 `result.findings[]` JSON(schema에 `file`·`line_start`·`line_end` 필수) → 스크립트가 그대로 읽는다. review는 companion이 `codex.stdout`에 담는 텍스트인데, 그 틀은 Codex 소스 `codex-rs/protocol/src/review_format.rs`가 코드로 찍는다 — `overall_explanation` 뒤에 `Full review comments:`(1건이면 `Review comment:`), finding마다 `- {title} — {abs_path}:{start}-{end}` 한 줄 + 두 칸 들여쓴 body 줄들. app-server v2는 구조화 finding을 이 텍스트로 렌더한 뒤에야 보낸다(`v2/item.rs` `ExitedReviewMode { review: String }`) → 구조화 원본은 우리 쪽에 도달하지 않으므로 스크립트가 이 틀을 파싱한다. rescue(read-only)의 `rawOutput`은 틀이 없다 → 자르지 않고 **텍스트 전체를 group 하나의 payload**로 Verifier에 보내고 항목 경계·ID와 인용 확인은 Verifier가 한다(verify/research 방식, 이슈 F2). 메인이 뽑는 안은 기각 — 저자가 finding을 빼먹거나 바꿔 쓰는 통로가 열려 Q3의 훅이 review에서만 무의미해진다. **파서 실패는 `uncited`가 아니다**: Codex가 틀을 바꾸면 스크립트는 `parse_error`로 멈추고 보고서에 "Codex 출력 형식이 바뀜"을 표시한다. 메인이 대신 자르는 fallback은 없다 — 조용히 떨어지면 독립성이 사라진 채 보고서만 멀쩡해 보인다. **정상 0건과 형식 변경을 가른다** (그릴 2026-09-14, 이슈 F5): formatter는 finding이 0건이면 헤더 없이 `overall_explanation`만 찍고, 설명까지 비면 `Reviewer failed to output a response.`를 찍는다. 스크립트 판정은 셋 — 헤더·항목 행이 모두 없고 본문이 있으면 정상 0건 / fallback 문구 또는 빈 stdout이면 `no_output`(보고서 "Codex 응답 없음 — 판정 없음") / 그 외 틀 불일치(헤더는 있는데 항목 행 0개, 항목 행 패턴 불일치)는 `parse_error`. 감수: 헤더와 항목 행 형식이 동시에 바뀌면 0건으로 오인한다 — 실제 formatter 출력 fixture로 검출한다.
2. **인용 존재 검사(스크립트, 결정론)**: 각 finding의 인용(file, line 범위)에 대해 파일 존재·줄 범위 유효를 판정해 JSON으로 돌려준다. 인용이 없으면 `uncited`. 존재하지 않으면 `missing`. 이것이 Six-way의 **False Positive / Uncited** 판정을 코드로 옮긴 것이다. 위키 `evidence-gates`: fact는 코드, judgment는 AI. **검수 대상과 작업 트리의 불일치** (그릴 2026-09-12 확정, 이슈 Q14): review·adversarial `--scope branch`의 대상은 커밋된 변경인데 스크립트는 작업 트리를 본다. 리뷰 중 유저가 파일을 더 고치면 유효한 인용이 `missing` → False Positive로 확정된다(2차 검수가 재현). 모델이 이를 눈치챌 자리는 이 구조에 없다 — 그래서 스크립트가 한 번 더 확인한다: 검수 대상 ref와 작업 트리가 다른지(`git diff --quiet <ref>`, 파일 단위). 다르면 그 파일을 인용한 finding은 인용 줄 존재 여부와 무관하게 전부 `Unverifiable`(사유 `worktree-drift`)이고 Verifier에 보내지 않으며, 보고서에 "리뷰 후 작업 트리가 바뀜" 한 줄 (그릴 2026-09-14 개정, 이슈 F4 — 초판은 `missing`만 바꿨으나, 줄이 남아 있어도 내용이 바뀌었으면 Verifier가 수정된 코드로 원 finding을 반박할 수 있다). 검토 후 기각: 검수 대상 트리를 임시 worktree로 꺼내 스크립트·Verifier가 같이 보는 안 — 과하다. 검수 시점 SHA·resolved scope 고정도 기각(F4) — 리뷰 중 HEAD 이동, 작업 트리 검수 중 변경처럼 파일 비교로 안 잡히는 drift는 수용한 한계. diff가 삭제한 줄을 지적한 finding도 같은 규칙으로 Unverifiable에 떨어지며 그대로 감수(드묾).
3. **판정 서브에이전트(finding group당 1개, 한 번에 10개 — 아래 묶음 규칙)**: 플러그인 `agents/`에 정의. 입력은 (a) finding 원문, (b) 인용 file:line, (c) 존재 검사 결과, (d) 분류 규칙(`evaluation.md` 참조). **fresh 컨텍스트의 범위** (그릴 2026-09-14 확정, 이슈 Q16): 없는 것은 대화 이력과 메인의 작성 기억이다. CLAUDE.md 계층(글로벌·프로젝트·local·managed)과 git status는 모든 서브에이전트가 시작 시 로드하므로 Verifier도 본다(공식 `sub-agents` §What loads at startup) — 공용 규칙이지 저자 기억이 아니라 독립성엔 무해하며, 완전한 정보 격리를 주장하지 않는다. 호출은 `subagent_type: codex-advisor:verifier`(plugin agent 식별자 `<plugin>:<agent>`, 신규 실행 — 그릴 2026-09-14, 이슈 I1)로만 — `fork`는 대화 전체를 상속하므로 쓰지 않는다. 허용 도구는 Read(인용 줄 ± 소량 컨텍스트)·Grep(인용 심볼 확인)만. 여기에 WebFetch 하나 추가(그릴 2026-09-13, 이슈 Q5 — 아래 **URL 출처 검수**). 출력은 아래 **Verifier 출력 계약**(항목별 `verdicts` 배열, `Unverifiable` 포함 — 그릴 2026-09-12). 많이 묶지 않는 이유: `references/compound-engineering-plugin/ce-code-review` — "묶어서 보면 패턴매칭으로 편향 재발"(상한은 묶음 규칙).
4. 메인 Claude는 JSON을 모아 Agreement 요약과 보고서를 쓴다. 판정은 안 바꾼다. 보고서에 `Verifier: fresh subagent (N groups)` 라벨. **evaluation.md의 저자 시점 절 삭제** (그릴 2026-09-14 확정, 이슈 Q8): "Self-Bias Awareness"(S4에서 기확정), "Cross-Model Comparison"(메인이 자기 과거 분석을 Found/Missed로 자기 채점), 보고서 템플릿의 "Additional Findings"·`Claude additional: N`(메인이 소스를 읽어 놓친 것을 찾아야 채움) — 셋 다 메인이 판정자이던 시절의 절이라 삭제. 템플릿은 Verifier 4분류 + Unverified 집계로 교체(research의 "놓친 것"은 Q5의 `missing-N`이 대신함). **저자 이견 줄(Author note)** (그릴 2026-09-14 확정, 이슈 Q18 — 유저 질문 "검수자 판정이 메인이 보기엔 아니면?"): 메인이 판정에 동의하지 않을 때 판정은 그대로 두고 그 finding 아래 `Author note (main session): <이견 + 근거>` 한 줄을 붙일 수 있다. 유저가 판정과 이견을 나란히 보고 결정한다. 검토한 선택지: (A) 메인 침묵 — 정보를 버림. (C) 메인이 판정을 덮어씀 — 저자가 다시 판정자. 확정 (B). 판정 기록은 손대지 않고, 라벨이 "저자의 말"임을 드러낸다. 이견은 판정 뒤에만 쓴다 — 판정 전에 Verifier에 닿는 경로 둘을 막는다: 최초 prompt는 S3b 훅이 교체하고, 실행 중·완료된 Verifier에 보내는 후속 `SendMessage`는 다섯 스킬 frontmatter `disallowed-tools: SendMessage`가 스킬 활성 중 메인 도구 풀에서 뺀다(그릴 2026-09-14, 이슈 F1 — `SendMessage`는 새 `Agent` 호출 없이 서브에이전트를 재개하므로 훅이 못 본다). 이 제한은 유저의 다음 메시지에 풀리므로 보고서 저장 후 Verifier 재개는 막지 않는다 — 저장된 판정은 바뀌지 않아 수용한 한계. 실측 조건: 플러그인 스킬에서 제거가 적용되는지, Phase 1.5 프리뷰 응답에 풀리지 않는지 — 실패 시 frontmatter 없이 이 한계만 명시한다. 기각: PostToolUse로 Verifier ID를 기록해 `SendMessage`를 deny하는 훅 — 메인은 적대적이지 않고 `SendMessage`는 prompt와 달리 매 호출 거치는 경로가 아니라 과함.
5. **Verifier 실행 실패 — 메인은 대신 판정하지 않는다** (그릴 2026-09-14 확정, 이슈 Q6): Agent 호출이 실패한 group은 보고서에 `Unverified — Verifier 실행 실패`로만 적는다. 나머지 group의 Verifier 판정은 그대로. 유저가 요청하면 같은 payload 경로로 Agent를 새로 호출한다(payload는 `${CLAUDE_PLUGIN_DATA}/tmp/`에 남아 있음) — 기존 Verifier를 `SendMessage`로 재개하지 않는다(F1) — 자동 재시도는 없음(동시 실행 한도 에러는 공식 docs가 재시도 금지를 안내, Q17). 폐지: 초안의 "열화 모드"(Agent 불가 시 메인이 기존 Phase 4를 수행하고 `Self-verified — independent sub-task unavailable` 라벨, gstack cso 방식). 이유 둘: (1) 전제 오류 — `claude -p`도 서브에이전트를 실행한다(공식 `headless` 문서), "headless = Agent 없음"이 아니다. (2) N group 중 일부만 실패해도 메인이 전부 판정하게 되어 이 스펙이 닫으려는 저자 판정 경로가 실패 한 번에 다시 열린다. "검수 못 함"이 "저자가 검수함"보다 정직하고, 메인이 판정하는 문장이 SKILL.md에 없으면 편향 예외를 테스트할 필요도 없다. 검증: `--disallowedTools Agent`로 실행 → 전 group `Unverified`, 메인 Read 호출 0회.

rescue `--write`: 판정 대상이 finding이 아니라 diff. 서브에이전트 입력 = 유저 task 원문(스펙이지 가설이 아님 — PROMPT_FILE 경로) + Codex가 만든 diff. 요구사항을 항목으로 나누고 ID를 붙이는 것은 Verifier다(그릴 2026-09-14, 이슈 F2 — 결정론 스크립트는 자연어 요구사항을 의미 단위로 못 자른다). 그 diff는 실행 **직전**과 **직후** 작업 트리 전체의 트리 스냅샷 차이다: 실제 index를 작업 트리 밖 임시 파일로 복사 → `GIT_INDEX_FILE=<tmp> git add -A` → `git write-tree`, 전후 `git diff <pre-tree> <post-tree>`(그릴 2026-09-14 개정, 이슈 F3). 맨 `git diff`는 실행 전부터 있던 유저 WIP를 섞고 새 파일을 빠뜨려 "범위 이탈"을 오판한다(Q14). 초판의 `git stash create` + 미추적 파일명 차집합은 커밋 전 새 파일(미추적)을 Codex가 고치거나 지운 변경을 못 잡아 대체했다 — 새 기능 개발 중엔 흔한 경우다. 재현(2026-09-14, 임시 저장소): 기존 미추적 파일 수정·삭제, 새 파일, 유저 WIP 위 Codex 변경 모두 포착, 유저 WIP 제외, 실제 index 불변, 깨끗한 시작도 트리 SHA 반환. 임시 index는 작업 트리 밖에 둔다(안에 두면 `add -A`에 섞임). 대형 저장소 비용은 (unverified) — 구현 시 실측. 출력 = 과제 충족 여부·범위 이탈·부작용. 메인은 안 읽는다. 서브에이전트는 diff 주변(변경된 함수·호출처)을 Read·Grep으로 볼 수 있음 — 다른 스킬 판정자와 동일 도구. 리포 전체 탐색 금지 (그릴 2026-09-11).

verify/research: 판정 대상이 Codex의 verdict/리서치 결과이고 blind payload로 문서 원문이 메인에 없다. 서브에이전트는 문서 + Codex 결과 + Codex에 보낸 PROMPT_FILE을 받아 분류한다. Codex 결과는 번호 없는 산문이라 항목 경계와 ID는 Verifier가 정한다(그릴 2026-09-14, 이슈 F2 — 항목 누락을 ID 대조로 잡는 보장은 스크립트가 finding을 자르는 review·adversarial에만 있고, 여기선 Verifier가 항목을 빠뜨리는 것을 수용한 한계로 둔다. 기각: Codex 프롬프트에 번호 형식 요구 — S1의 verify 골든 불변과 충돌·산문 파싱 불안정; 결과 전체 1판정 — 항목별 severity가 없어 PASS/FAIL 불가). PROMPT_FILE은 유저가 프리뷰에서 승인한 범위라 research `missing-N`의 기준이 된다 — 메인이 범위를 요약해 넣지 않는다. 문서 경로는 선택값이고 topic-only research는 문서 없이 돈다(그릴 2026-09-14, 이슈 F7). **인용 존재 검사는 안 함** (그릴 2026-09-11): 검사는 `file:line`을 인용하는 review/adversarial만(rescue read-only는 단계 1대로 전체 1 payload). payload 파일은 같은 S3 스크립트가 `--mode doc`으로 쓴다(Q4). verify는 문서 하나가 입력 전부라 서브에이전트가 헤맬 공간이 없고, 섹션 인용 형태("§3.2"/"Rollback 절"/본문 인용)가 비정형이라 grep 규칙은 유지비만 생김. research는 URL 검증 = 네트워크라 스크립트 범위 밖. 두 스킬은 서브에이전트가 인용 확인까지 같이 함(SOFT — 입력이 유한해 감수). 두 스킬 모두 항상 새 Codex 스레드 — `resume` 키워드는 D1(그릴 2026-09-13, Q13)에서 삭제.

**URL 출처 검수 — Verifier 하나에 WebFetch 추가** (그릴 2026-09-13 확정, 이슈 Q5): research 결과는 URL 출처 주장이 대부분인데 Read·Grep으로는 열 수 없다. 검토한 선택지: (a) research 전용 Verifier agent 파일 분리 + WebFetch — 새 파일(기각: agent 하나로 충분). (b) URL 인용은 전부 `Unverifiable` — 검수자가 출처를 안 여는 research 검수는 껍데기(기각). **확정 (a′)**: `agents/verifier.md` 하나의 `tools:`에 WebFetch를 넣는다. 규칙은 payload 지시로 — payload에 인용된 URL만 연다, 탐색 금지. 못 열면(권한 거부·타임아웃·리다이렉트) `Unverifiable`(사유 `external-source`). 감수하는 것 둘(공식 `tools-reference` §WebFetch tool behavior, 2026-09-13 수령): (1) 수동 권한 모드에선 fetch마다 프롬프트 — "Yes"는 한 번만, 도메인별 "don't ask again"으로 줄일 수 있고 `auto` 모드면 없음. (2) WebFetch는 작은 모델이 요약해 돌려주는 손실 도구 — "페이지에 X가 없다"가 "안 물어봐서 못 찾음"일 수 있으므로, 부재 확인만으로는 Disputed를 내지 않고 Unverifiable로 떨어뜨린다(Q15 규칙: 반박 근거를 봤을 때만 Disputed). review·adversarial·rescue payload에는 URL이 없으므로 WebFetch가 있어도 쓸 일이 없다 — 스킬별 도구 분기 코드는 만들지 않는다. **원문·diff 전달** (그릴 2026-09-12 확정, 이슈 Q4): 문서 원문은 payload에 **경로만** — 메인이 prompt에 본문을 넣으면 메인이 읽은 것이라 blind payload가 깨진다. Verifier는 경로를 Read. rescue `--write`의 diff는 Verifier가 Bash가 없어 못 뽑으므로 스크립트가 `git diff <pre-tree> <post-tree>`를 파일로 떨궈 경로를 담는다. payload 파일을 쓰는 코드는 S3 스크립트 한 곳: `--mode doc`(verify/research — 인용 검사 없이 PROMPT_FILE 경로·문서 경로(있을 때만)·Codex 결과 경로·규칙 경로 + manifest, F7)과 `--mode diff`(rescue `--write` — diff 파일 경로 + PROMPT_FILE 경로, F3). 스킬 Bash 단계가 `cat >`로 직접 payload를 쓰는 안은 기각 — 메인이 파일 내용을 쓰는 셈이라 Q3 취지와 어긋난다. 새 코드는 이 스크립트와 S3b 훅 둘뿐이며 둘 다 판단 없이 자르기·확인·해시·경로만 다룬다. 메인이 그 문서를 작성했다면 blind payload로도 저자 기억은 지워지지 않으므로 두 스킬에도 Verifier의 실질 이득이 있다(이슈 W2).

**Read 차단 PreToolUse 훅은 만들지 않는다.** 서브에이전트에는 막을 히스토리가 없다. (초안의 열화 모드는 Q6에서 폐지 — 메인이 Phase 4에서 읽는 경로 자체가 없다.) 훅이 필요해지는 건 "메인이 Phase 1~3에서 읽는" 경우뿐인데, 그건 이 구조에서 메인이 Phase 4 자체를 안 하므로 동기가 사라진다. 그릴 2026-09-11 재검토 → **확정: 훅 없음**. 판정은 서브에이전트가 하므로 메인이 Phase 1~3에 읽어도 판정 불변, 메인 역할은 JSON 집계뿐. 훅은 Phase 경계를 알 수 없어 구현도 불명확. (이 기각은 **Read 차단** 훅에 한한다 — 아래 payload 훅과 다른 종류.)

**Verifier payload — 작성은 스크립트, 전달은 훅이 강제** (그릴 2026-09-12 확정, 이슈 Q3): Verifier를 띄우는 `Agent` 호출의 `prompt`는 메인이 쓴다. 메인은 코드 저자라 "참고로 호출자가 이미 막고 있음" 같은 한 줄을 덧붙일 수 있고, 그러면 ③은 ①과 같은 쓰기 누수로 돌아간다(ADR 0012 Consequences "메인의 복종에 의존하지 않는다"와 모순). 검토한 선택지: (A) "verbatim 전달" 지시 + 테스트 로그로 사후 검출 — 실행 중 못 막음, ADR 후퇴. (B) 스크립트가 payload 파일 생성 + 경로만 전달 — 경로 옆에 덧붙이는 건 못 막음. (C) 플러그인 PreToolUse 훅(matcher `Agent`)이 `subagent_type`이 Verifier일 때 prompt에서 payload 경로를 뽑아 **prompt 전체를 파일 내용으로 `updatedInput` 교체**, 경로가 없거나 파일이 없으면 `deny`. **확정: C.** 누수 통로가 prompt 한 곳이고 그걸 코드가 닫는다("강제는 구조로"). 실측 2026-09-12: `claude -p`에서 훅이 Agent `tool_input`(`prompt`·`subagent_type`·`description`·`run_in_background`)을 받고, `updatedInput`으로 바꾼 prompt대로 서브에이전트가 답했다.

- payload 파일(`group-N.json`)은 S3 스크립트가 쓴다(verify/research의 payload 생성 경로는 Q1·Q4에서 정한다). 메인은 파일을 고르기만 한다.
- **해시 검증** (그릴 2026-09-12): 메인이 payload 파일 자체를 고쳐 쓰는 경로를 닫기 위해 스크립트가 `manifest.json`에 각 payload의 sha256을 함께 쓴다. 훅은 교체 전에 해시를 대조하고 불일치면 `deny`. 매니페스트까지 일관되게 위조하는 건 명백한 고의라 감수. payload가 경로로 가리키는 파일(PROMPT_FILE·문서·Codex 결과·diff)은 해시 대조 대상이 아니다 — 훅 통과 후 그 파일을 고치는 것도 같은 고의 위조라 감수.
- **훅 오류는 막는 쪽으로** (그릴 2026-09-14, 이슈 F8): Claude Code는 command 훅의 exit 1·JSON 파싱 실패·스키마 불일치를 non-blocking으로 보고 도구를 실행한다(공식 `hooks` §Exit code output). 그래서 훅은 잡을 수 있는 모든 예외(manifest 손상·읽기 실패·stdin 파싱 실패·예상 못 한 throw)를 `deny` 또는 exit 2로 끝낸다. 훅 타임아웃·`disableAllHooks`처럼 훅이 결정 자체를 못 내는 경우는 보장 범위 밖 — 그때 Verifier는 메인이 쓴 prompt를 받을 수 있다.
- 훅은 `subagent_type`만 본다 — Phase 경계를 알 필요가 없다. 매칭 식별자는 `codex-advisor:verifier`(그릴 2026-09-14, 이슈 I1). 짧은 이름 `verifier`로도 plugin agent가 뜨는지는 (unverified) — S3b 통합 검증에서 확인하고, 뜨면 훅 매칭에 포함한다. 다른 서브에이전트 호출엔 관여하지 않는다. Verifier 호출이면 `prompt` 교체와 함께 `model` 필드를 제거한다(R3, 그릴 2026-09-14) — 저자가 검수자 모델을 고르지 못하게.
- Verifier가 받는 텍스트 = 스크립트가 만든 파일 내용, 그 이상도 이하도 없다. 이것이 "Verifier의 입력은 finding + 인용 + 존재 결과 + 규칙뿐"을 지시가 아니라 구조로 만든다.
- 이 훅은 `-p`에서도 동작한다(실측 2026-09-12).

**판정 서브에이전트 프롬프트 3원칙** (그릴 2026-09-11 확정 — 문구는 이슈 슬라이스에서 `validator-template.md` 기반으로 작성): (1) 기본 판정은 Disputed — 의심되면 reject. (2) 원 finding에 commitment 없음 — Codex 편도 안 듦. (3) 출력은 JSON만, 설명은 evidence 필드에. 근거: Anthropic L31 "분리만으론 관대함이 안 사라짐, 회의적 튜닝 필요".

**"틀렸다"와 "모르겠다"를 가른다 — `Unverifiable`** (그릴 2026-09-12 확정, 이슈 Q15): 3원칙의 "기본 Disputed"는 관대함을 막지만, 두 가지를 하나로 뭉갠다 — Verifier가 반박에 성공한 것(Disputed)과 Read·Grep 범위에서 증거를 못 찾아 판정하지 못한 것. 유저는 보고서에서 그 둘을 구별 못 하고, 테스트도 못 한다 — S4 수용기준이 스키마 + "없는 함수 인용을 Agreed면 실패"뿐이라 **fixture 전부를 Disputed로 내는 Verifier가 통과**한다("회의적"과 "일 안 함"이 같은 결과). 확정: (1) 분류에 `Unverifiable`(증거 부족·판정 불가)을 추가한다. Disputed는 반박 근거를 evidence에 적어야 하고, Unverifiable은 무엇이 부족했는지를 적어야 한다. 기본 판정은 여전히 Disputed — 단 "반박할 근거를 봤을 때"이며, 못 봤으면 Unverifiable. (2) S4 fixture는 네 결과를 모두 요구한다: 명백히 맞는 finding → Agreed, 없는 함수 인용 → Agreed면 실패, 맞지만 맥락 부족 → Nuanced, 인용 범위 밖 증거가 필요한 finding → Unverifiable. 전부 같은 분류를 내는 Verifier는 통과하지 못한다. 보고서 집계엔 Unverifiable 건수를 따로 적는다 — 검수 실패는 Codex 오류가 아니다. 출력 계약의 나머지는 아래.

**Verifier 출력 계약 — 스키마 하나, 항목 배열** (그릴 2026-09-12 확정, 이슈 Q2): 다섯 스킬 모두 같은 JSON을 돌려준다.
```json
{"verdicts": [{"id": "<payload가 준 항목 ID>", "classification": "Agreed|Disputed|Nuanced|Unverifiable", "severity": "<payload가 준 값 그대로, 없으면 null>", "evidence": "<본 것>", "reason": "<한 줄>"}]}
```
- 항목: review/adversarial은 스크립트가 번호를 매긴 finding 전부 — group에 finding이 둘이면 verdict도 둘, payload에 있는 ID가 빠지거나 없는 ID가 생기면 집계가 그 group을 `Unverifiable`(사유 `contract-violation`)로 적는다(검수자가 하나를 빠뜨리는 것도 검출). 산문 결과(verify·research·rescue read-only)와 rescue `--write` 요구사항은 Verifier가 항목을 나누고 ID를 붙인다 — 빠뜨림은 검출하지 못한다(그릴 2026-09-14, 이슈 F2). 모든 모드에서 ID 중복·스키마 위반은 `contract-violation`.
- 모드 차이는 payload의 "무엇을 판정하라"에만 있다. review/adversarial: Codex finding 1개 = 항목 1개. rescue `--write`: 유저 task 원문에서 Verifier가 나눈 요구사항 1개 = 항목 1개(충족 = Agreed, 이탈·미충족 = Disputed, 조건부 = Nuanced, diff만으론 판단 불가 = Unverifiable) + 검수자가 발견한 부작용은 `id: "side-effect-N"`으로 추가 허용(이 경우만 새 ID 허용). verify/research: Codex의 지적/주장 1개(Verifier가 나눔) = 항목 1개, `severity`는 Codex가 붙인 P1/P2를 그대로 통과. research는 여기에 더해 검수자가 PROMPT_FILE 범위(F7)상 빠졌다고 본 핵심 항목을 `id: "missing-N"`으로 추가 허용(그릴 2026-09-13 확정, 이슈 Q5 — 기존 Phase 4 synthesis "Codex가 놓친 것 채우기"의 담당자를 메인에서 Verifier로 옮긴 것. 메인은 blind payload라 결과 본문을 못 보고, Verifier는 다른 모델이라 cross-model 관점이 유지된다. 새 ID 허용은 rescue `side-effect-N`과 같은 규칙, 스키마 변경 없음. 기각: (c) 메인이 JSON만 보고 종합 — 판정만 있어 놓친 것을 쓸 수 없음. (d) synthesis 삭제 — 스킬 설명 "cross-model synthesis"가 거짓이 됨).
- 모드별 스키마 3개는 기각 — 훅·스크립트·집계·테스트가 세 배.
- **PASS/FAIL은 검수자가 내지 않는다.** 메인이 규칙으로 집계한다(판단 아님): `severity: P1` 항목 중 Agreed 또는 Nuanced가 하나라도 있으면 FAIL, P1이 Unverifiable이면 FAIL로 세되 사유를 "미검증 P1"로 따로 적는다, `Unverified`(Agent 실행 실패) group이나 severity를 알 수 없는 항목(null·계약 위반)이 하나라도 있으면 FAIL(사유 "미검증") — 검수 실패를 통과로 바꾸지 않는다(그릴 2026-09-14, 이슈 F6). 나머지는 PASS. 규칙은 `evaluation.md`에 한 번만 적는다.
- 저자 시점 분류 **"Already considered"는 삭제**한다 — "내가 이미 고려했다"는 저자만 할 수 있는 말이고 Verifier에겐 없는 정보다. Codex 지적이 문서 안에서 이미 다뤄졌으면 Verifier가 그 절을 인용해 Disputed로 낸다.

**묶음 규칙** (그릴 2026-09-11 확정, 2026-09-14 개정 — 이슈 Q17): 인용 존재 검사 스크립트가 **같은 파일**을 인용한 finding에 같은 `group_id`를 부여하고, 한 group = 서브에이전트 1개. group 크기 상한 둘 — finding **5개**, payload 본문 **6,000자** — 둘 중 먼저 걸리는 쪽에서 줄 순서로 쪼갠다. finding 하나가 6,000자를 넘으면 쪼개지 않고 그 finding만으로 group을 만든다 — 원문을 자르면 판정 대상이 바뀐다(그릴 2026-09-14, 이슈 I2). 다른 파일끼리는 묶지 않는다. 묶음 판단은 스크립트만 — 메인 Claude 재량 묶기는 기각(편향 당사자가 희석 통로를 쥠, `deterministic-over-clever`). 메인이 띄우는 건 한 번에 **10 group**까지, 완료 후 다음 묶음 — Claude Code 동시 서브에이전트 한도 20(`sub-agents` §Concurrent subagent limit, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`)을 유저의 다른 작업과 나눠 쓴다. 한도 에러는 재시도 금지 안내가 붙으므로 부딪히기 전에 조절한다. 개정 이유: 2026-09-11판은 "줄 범위 겹침만 묶음, 상한 없음, 병렬이라 지연 동일"이었다. finding 25개면 검수자 25개 → 20 한도에 걸려 5개는 시작도 못 하고 `Unverified`(Q6). 유저 제안: 비슷한 건 같은 검수자가 보되 너무 커지지 않게. 같은 파일 묶기는 그 파일을 검수자 여럿이 각자 Read하던 중복도 없앤다. "묶으면 패턴매칭으로 관대해진다"(ce-code-review) 우려는 많이 묶는 것과 메인이 묶는 것이 핵심 — 5개 상한과 스크립트 결정이 둘 다 막는다. 5·6,000자·10은 근거 있는 수치가 아니라 타협값 — S4 fixture에서 "5개 묶음이 1개 묶음보다 Agreed를 더 내는가"를 한 번 재고 조정한다.

**크기 임계 없음** (그릴 2026-09-11): finding 1개여도 서브에이전트. "작으면 메인이 직접"은 편향 예외를 다시 여는 것. 비용은 finding 수에 비례하므로 별도 임계 불필요.

**서브에이전트 모델**: **`model:` 생략 = 유저의 서브에이전트 모델 설정 존중** (그릴 2026-09-11 "상속" → 2026-09-14 교정, 이슈 R3). agent 정의에 `model:` 안 박음 — 박으면 모델 지식이 플러그인에 들어와 스펙 012 위반. 생략의 실제 의미(공식 `sub-agents` §Choose a model, 2026-09-14 수령): 해석 순서는 (1) 호출 시 `model` 파라미터 → (2) frontmatter `model:` → (3) `CLAUDE_CODE_SUBAGENT_MODEL` → (4) 메인 모델. 우리는 (2)가 비어 있으므로 (3) 유저 환경변수, 없으면 (4) 메인 모델 — "부모 고정 상속"이 아니다. (1)은 메인(저자)이 `model: haiku`처럼 넘겨 검수자를 약화시키는 통로라 **S3b 훅이 `updatedInput`에서 `model` 필드를 제거**한다 — 훅이 prompt를 교체하는 같은 자리. 기각: `model: inherit` — 메인 모델 강제는 유저의 서브에이전트 설정을 무시한다. 위키 `loops-explained-kopadze` "reviewer는 느리고 엄격하게"는 프롬프트 3원칙으로 충족.

왜 되는가: 위키 `verification-layers` L122 "검증은 항상 별개 인스턴스"; Anthropic 원문 L31 "일하는 에이전트와 판단하는 에이전트를 분리하는 게 강한 지렛대"; 같은 글 L135 "Claude는 문제를 찾고도 별거 아니라고 스스로 넘긴다" — 이게 지금 우리 메인 Claude의 Phase 4다. 서브에이전트는 그 코드를 쓴 적이 없으므로 옹호할 것이 없다.

### D4 — `spark` 별칭 삭제

`apply-codex-config.py`의 `MODEL_ALIASES`와 README·SKILL.md의 spark 언급 삭제. 스펙 012 D2가 "유지"로 남긴 유일한 모델 지식이며, 그때 근거는 "companion과 동일 별칭"이었다. 지금은 가리키는 모델이 캐시에 없다. 유저가 `spark`를 치면 그대로 config.toml에 쓰이고 Codex가 거부한다 — 012의 "판정하지 않는다" 원칙과 같은 결과.

### D5 — 용어집·문서 갱신

`docs/context/codex-advisor.md`:
- **Companion** 항목에 호출 프로토콜 명시: `codex app-server` JSON-RPC over stdio(`thread/start` → `review/start` | `turn/start`), `codex exec` 아님. AGENTS.md 로딩은 Codex 코어 동작이며 companion은 관여하지 않음(Astra 가이드가 AGENTS.md 민감도 상승을 명시 — 실측은 Out of Scope).
- 3층 모듈 경계 표(우리 / Official companion / Codex CLI)와 프롬프트 소유권 표(review=Codex 서버, adversarial=Official prompts, task=우리).
- **Double-check independence** 항목을 read-side / write-side 둘로 분리하고 판정자(fresh subagent)와 `Unverified` 표시 추가.
- **Vendored prompt blocks**·**Provenance debt** 항목을 D2 이후 상태로 갱신(출처가 5.4 가이드 → 5.6/Astra 가이드).
- **Five-way classification** → **Six-way classification**으로 개명, "False Positive/Uncited는 스크립트 판정, Agreed/Disputed/Nuanced/Unverifiable은 서브에이전트 판정" 추가(그릴 2026-09-12 반영됨).

README: "How a call is translated" 4단계 double-check 설명을 판정자 구조로 갱신. `plugin.json`·`marketplace.json` description에 "fresh-context double-check" 반영.

### D6 — 버전

4.7.1 → **5.0.0** (그릴 2026-09-14 확정, 이슈 R2; 초안 4.8.0 minor 교정). major: `--no-preview` 플래그(Q7)와 verify/research `resume` 키워드(Q13)가 없어져 기존 호출이 깨진다 — AGENTS.md "major = breaking interface changes". 초안 근거 "명령 표면·플래그 동일"은 그 두 삭제로 틀렸다. 기각: 4.8.0 유지(개인 플러그인이라 감수) — 규칙이 있으면 따르는 게 싸다.

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
- ③ 존재하지 않는 file:line을 인용한 fixture finding이 최종 보고서에서 False Positive로 분류되는가. 존재하는 인용은 서브에이전트 JSON이 스키마를 만족하는가. `--disallowedTools Agent`에서 전 group이 `Unverified`이고 메인 Read 호출이 0회인가.
- D4 `spark`가 확장되지 않는가.

## Out of Scope

- Native path(review / adversarial)의 Codex 쪽 프롬프트. ADR 0004대로 불가침.
- Official 플러그인 포크·병합. 이 세션에서 검토 후 기각 — 프롬프트 최신화는 병합 없이 가능하고, 병합은 companion 5,469줄 + 테스트 3,715줄의 유지 부채만 더한다.
- PreToolUse 훅으로 Phase 1~3 읽기 차단. D3 구조에서 동기 소멸. (Verifier payload 강제 훅은 별개 — D3 참조, 2026-09-12 채택.)
- AGENTS.md가 companion 경유 Codex 스레드에 실제 로드되는지 실측. Codex 문서상 로드되며 companion은 관여하지 않는다. 별도 E2E 1회로 확인 가능하나 이 스펙의 변경과 독립.
- 하용호식 N개 병렬·2회 반복 검증. group당 1개로 시작. 확장은 데이터 보고.
- Verifier 후속 메시지 차단 훅(이슈 F1 B안), review·adversarial 대기 30분 상한(이슈 I3 — 삭제, 멈춘 작업은 유저가 `/codex-cancel`·Esc로 끝냄), 검수 시점 SHA 고정 drift 검출(이슈 F4). 모두 드문 경우에 비해 과해 기각.
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

> **역사 기록 (2026-09-11 작성)** — 이 절과 아래 §핸드오프는 그릴 전 자료다. 반박 포인트는 D1~D6과 이슈 016의 Q·R·F 결정으로 모두 닫혔다. 현재 결정은 본문 D절, 진행 상태는 이슈 016을 본다. 경로·references 목록은 구현 참고용으로 남긴다(이슈 N2, 2026-09-14).

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

- **무엇**: Phase 4를 메인에서 떼어 finding당 서브에이전트 1개 + 인용 존재 스크립트로 분리. 실행 실패는 `Unverified`.
- **메커니즘**: 메인은 Codex JSON 파싱·집계·보고만. 스크립트가 fact(존재)를 판정, 서브에이전트가 judgment(Agreed/Disputed/Nuanced)를 판정. 서브에이전트 입력은 finding + 인용 + 규칙뿐이라 세션 히스토리·작성 이력이 물리적으로 없음(CLAUDE.md·git status는 공유 — Q16).
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
