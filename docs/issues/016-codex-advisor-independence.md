# 이슈 016 — codex-advisor 검수자 독립성 복원 구현 (슬라이스 S1~S6)

> 상태: **blocked — 착수 전 결정 대기** (아래 §착수 전 결정, 검수 2회분) · 생성: 2026-09-11
> 스펙 (PRD): `docs/specs/016-codex-advisor-independence.md` — 문제 정의, 유저 스토리, 결정 D1~D6, 그릴 확정 사항 전부 스펙 참조. 스펙과 이 문서가 다르면 스펙이 맞다.
> 대상 플러그인: `plugins/codex-advisor/` (v4.7.1 → v4.8.0)
> 용어집: `docs/context/codex-advisor.md` — **Double-check independence / Verifier / Hypothesis exclusion / Finding group / Autonomy policy** · ADR: 0004(전제), 0012(③ 구조)
> 원칙: 강제는 구조로, 판단은 fresh 컨텍스트로, fact는 스크립트로. 지시문은 "왜"를 설명하고 MUST를 남발하지 않는다(skill-creator 가이드).

## 핸드오프 (다음 세션용 — §착수 전 결정이 비면 이 절도 지운다)

> 작성 2026-09-11. 다음 세션 목표: §착수 전 결정을 **나열 순서대로, 한 번에 한 항목씩** 그릴해 확정한다. 구현은 그 다음.

### 진행 방식 (유저 지시)

항목마다 이 순서로 한 턴에 **질문 하나**만 던지고 답을 기다린다:
1. **뭐가 문제인가** — 유저는 검수 결과를 모른다고 전제한다. 정상/문제 상황을 나란히 둔 구체 예시(코드·prompt 조각)로 이해시킨다.
2. **선택지** — 2~3개, 각각 적용하면 어떻게 되는지.
3. **추천 + 왜** — 스펙 원칙(강제는 구조로, fact는 스크립트)·기존 결정과의 관계를 근거로.
4. **추천대로 하면 어떻게 되나** — before/after 예시.

"먼소리야"가 나오면 처음부터 맥락을 담아 다시 예시로 설명한다. 확정되면 §착수 전 결정 머리말의 반영 규칙(스펙 D절 → 슬라이스 → 항목 삭제)을 따른다. 그릴 중 코드 편집 X, 조사 보고 ≠ 승인.

### 그릴 순서 (= §착수 전 결정 나열 순서)

| 순서 | 항목 | 한 줄 |
|---|---|---|
| 1 | Q3 | Verifier에 들어가는 글(prompt)을 결국 코드 작성자(메인)가 쓴다 |
| 2 | Q15 | 전부 `Disputed`만 내는 Verifier도 S4 수용기준을 통과한다 |
| 3 | Q14 | Codex가 본 버전 ≠ 스크립트가 보는 작업 트리 → 유효 인용이 False Positive |
| 4 | Q1 → Q2 → Q4 | Verifier 입력(finding 추출)·출력 계약·원문 전달이 미정 |
| 5 | Q13 | resume이 이전 스레드의 가설·작성 이력을 유지 (maker = checker 가능) |
| 6 | Q5 → Q6 → Q7 | research 검증 범위 / 열화 모드 조건 / 헤드리스 검증 경로·exit 코드 |
| 7 | Q17 → Q16 | 동시 서브에이전트 한도 20 / fresh 컨텍스트 범위 과장 |
| 8 | Q8 → Q10 → Q11 | 저자 시점 절 담당자 / 되묻기 원인 설명 / 유저 원문 판별 계약 |
| 9 | Q12, R1~R3 | 조율 — 착수 직전에 정함 |

W1~W3은 그릴하지 않고 슬라이스 수정 때 반영.

### 이전 세션에서 Q3에 이미 던진 제시안 (유저 미답 — 다음 세션은 Q3를 위 방식으로 다시 설명하고 묻는다)

- **A. 감수 + 검출**: 지시 + 테스트 로그 대조. ADR 0012 Consequences 1항을 "전달은 지시 의존, 테스트로 검출"로 낮춤.
- **B. 경로만 + 지시**: 스크립트가 `group-N.json`을 쓰고 prompt엔 경로 한 줄. 메인이 경로 옆에 말을 덧붙이는 건 못 막음.
- **C. 훅 강제 (추천했음)**: 플러그인 PreToolUse 훅(matcher `Agent`), `subagent_type`이 verifier일 때만 prompt에서 payload 경로를 뽑아 prompt 전체를 파일 내용으로 `updatedInput` 교체, 경로 없으면 `deny`. 추천 이유: 누수 통로가 prompt 한 곳이고 그걸 코드가 막음 / 스펙이 기각한 건 **Read 차단** 훅(사유 "Phase 경계를 모름")이라 `subagent_type`만 보는 이 훅엔 해당 없음 / `-p`에서도 동작. 미실측: Agent `updatedInput` 교체 동작. 후속 질문 후보: 메인이 payload 파일 자체를 미리 고쳐 쓰는 경로(스크립트 해시 매니페스트로 훅이 검증?).

### Suggested skills

- `/grill-with-docs` → `grilling` + `domain-modeling`. grilling의 "frontier 전체를 한 라운드에"는 쓰지 않는다 — 위 진행 방식(한 번에 하나)이 우선. 용어가 바뀌면(예: Q16 → Verifier 정의, Q10 → Autonomy policy) `docs/context/codex-advisor.md`를 즉시 고친다.
- `writing-for-agents` — 확정 결과를 스펙 D절·슬라이스·ADR 0012에 반영할 때.
- 구현 착수 후에만 `skill-creator-pro`.

### 세션 사실 (문서에 없는 것)

- 2차 검수 원문은 유저가 대화에 붙여넣은 것이며 파일로는 없다. 내용은 §착수 전 결정에 전부 반영됨.
- 공식 docs 사본은 세션 스크래치에 있었고 소멸한다. 재수령: `curl -sL https://code.claude.com/docs/en/<page>.md` — 쓴 페이지 `hooks`(§Agent 입력 필드 · §PreToolUse decision control), `sub-agents`(§Concurrent subagent limit · §What loads at startup · §Choose a model), `headless`(§Background tasks at exit · §Follow subagent messages), `tools-reference`(BashOutput·KillShell 부재, TaskStop).
- 이 절과 §착수 전 결정 재구성은 미커밋. 스펙·ADR 0012·용어집은 커밋 3f5ec7b.

## 착수 전 결정

> 출처: 구현 전 검수 2회(둘 다 2026-09-11). **1차** = Q1~Q12 원문. **2차** = 1차 재판정(각 항목의 `2차` 줄) + 신규 Q13~Q17 + 조율 R1~R3 + 문구 W1~W3. 2차 대조 기준: Claude Code 2.1.268, 공식 docs(`code.claude.com/docs/en/<page>`, 2026-09-11 수령), companion 코드, 임시 fixture 재현. 2차가 측정하지 않은 것: Verifier 실제 판정 품질, Claude→Codex 전체 실행.
> 표기: **사실** = 코드·docs 대조로 확인. **제안** = 미승인. "추측" = 미검증.
> 진행: 나열 순서대로 한 번에 하나씩 그릴한다(뿌리 결정이 먼저, Q 번호는 ID일 뿐). 한 항목 확정 = 스펙 해당 D절에 "그릴 YYYY-MM-DD" 표기로 반영 → 영향 슬라이스의 본문·수용기준 수정 → 이 절에서 항목 삭제. 절이 비면 상태를 `ready-for-agent`로 되돌리고 이 절을 지운다.
> 경로 약어: `companion` = `references/codex-plugin-cc/plugins/codex/scripts/codex-companion.mjs`, `lib/` = 같은 폴더의 `lib/`.

### 차단 — ③ 계약 결함 (P1)

#### Q3 — Verifier payload 작성 주체 (막음: S3, S5a, S5b)
- **사실**: Agent 호출의 `prompt`는 메인이 쓴다. 메인이 판정 의견을 덧붙이면 ③이 ①과 같은 쓰기 누수로 돌아간다 — ADR 0012 Consequences 첫 항목("메인의 복종에 의존하지 않는다")과 모순.
- **1차 제안**: 스크립트가 group별 payload를 생성하고 메인은 verbatim 전달. 관측 seam = stream-json에서 서브에이전트의 첫 `user` 메시지(`parent_tool_use_id` ≠ null).
- **2차**: 문제 타당, 제안 불충분. "verbatim 전달"도 지시 준수에 의존한다. 로그 대조는 누수를 **검출**할 뿐 실행 중 **방지**하지 않는다. 첫 `user` 메시지 = prompt라는 설명은 docs가 **foreground** 서브에이전트에 대해서만 명시한다(`headless` §Follow subagent messages) — 하네스 실행 방식과 실제 Agent 호출 인자를 함께 고정해야 한다.
- **사실(2차 후 확인)**: PreToolUse 훅은 Agent 호출의 `prompt`·`subagent_type`을 입력으로 받고, `updatedInput`으로 도구 입력 전체를 교체하거나 `deny`할 수 있다(`hooks` §Agent, §PreToolUse decision control). 실측 전.
- **쟁점**: 누수를 구조로 방지할지(무엇으로), 검출로 감수하고 ADR 0012 Consequences를 고칠지.

#### Q15 — 전부 기각하는 Verifier가 수용기준을 통과 (신규, 막음: S4)
- **사실**: S4 수용기준은 JSON 스키마 + "없는 함수 인용이 Agreed면 실패"뿐이다. fixture 3건 모두 `Disputed`를 내는 Verifier가 통과한다. 3원칙의 "기본 Disputed"와 결합하면 실제 문제를 누락해도 테스트는 초록이다.
- **사실**: 보고서의 `Verifier: fresh subagent (N groups)` 문자열은 판정이 실제로 수행됐는지, 집계에 누락이 없는지 증명하지 않는다.
- **2차가 요구한 구분**: 명백히 맞는 finding의 인정 / 맥락 보완 사례(Nuanced) / **증거 부족(판정 불가)** 과 **반박 성공(Disputed)**.

#### Q14 — 검수 대상 스냅샷 (신규, Q4 부수쟁점·Q9 흡수, 막음: S3, S4, S5a)
- **사실**: S3는 **현재 작업 트리**에서 파일 존재·줄 수를 검사한다. review·adversarial `--scope branch`(`--base`)의 대상은 커밋된 변경이고 작업 트리엔 별도 수정이 있을 수 있다. 2차가 임시 저장소로 재현: 대상 HEAD엔 해당 줄(4행)이 있고 작업 파일은 1행 → 유효한 인용이 `missing` → False Positive.
- **흡수(구 Q9)**: diff가 삭제한 파일, 그리고 살아 있는 파일에서 삭제된 줄을 지적한 finding도 같은 원인으로 `missing` 확정되고 Verifier가 뜨지 않는다.
- **흡수(구 Q4 부수쟁점)**: rescue `--write`의 `git diff`는 실행 전부터 있던 유저 WIP를 포함하고 untracked 신규 파일을 뺀다(`PRE_LIST`는 파일명만 저장) → Codex가 만든 변경을 식별하지 못해 "범위 이탈" 오판.
- **2차**: 삭제 경로만 예외 처리해서는 안 풀린다. 검수 대상 ref·diff·파일 버전을 스크립트와 Verifier가 공유해야 한다.

#### Q1 — S3 입력: 구조화된 finding은 adversarial뿐 (막음: S3, S5a)
- **사실**: review `--json`은 `codex.stdout`에 텍스트만 담는다(`companion:375-386`). adversarial은 `result.findings[]`이고 schema가 `file`·`line_start`·`line_end`를 필수로 둔다(`schemas/review-output.schema.json`) → `uncited`는 `parseError` 때만 생긴다. rescue는 `rawOutput` 텍스트 + `touchedFiles`뿐, 인용 목록이 없다(`companion:511-517`).
- **쟁점**: review·rescue read-only의 인용을 누가 뽑나. 메인 LM 추출이면 "fact는 스크립트"가 깨지고 메인이 finding을 빠뜨리는 통로가 생긴다(Q3과 같은 누수).
- **선택지**: (a) review 텍스트를 스크립트가 파싱 — 텍스트 포맷 안정성 미확인 (b) review·rescue read-only는 스크립트 없이 S5b식 경로 (c) 메인 추출 + 원문 대조 스크립트.
- **2차**: 핵심 타당. 단 `parseError`와 `uncited`는 다른 상태다 — 파싱 실패를 미인용 finding으로 취급하면 안 된다.

#### Q2 — Verifier 출력 계약 (막음: S4, S5a, S5b)
- **사실**: group은 finding 여러 개인데 출력은 `{classification}` 하나다. rescue `--write` 판정(충족/이탈/부작용)과 verify 분류(Valid catch / Already considered / False Positive / Uncited, P1·P2 → PASS/FAIL)는 `Agreed|Disputed|Nuanced`에 없다. "Already considered"는 저자 시점 분류다.
- **쟁점**: finding별 배열로 바꿀지, 모드별 스키마를 둘지, PASS/FAIL을 누가 산출할지.
- **참고**: agent는 인자를 받지 않는다(모드는 prompt에 담긴다). `tools`는 agent 파일당 고정이다.
- **2차**: 타당. 필요한 계약 = 모드별 판정 · finding별 ID · 심각도 · PASS/FAIL 계산 규칙.

#### Q4 — 원문·diff 전달 방식 (막음: S5a rescue `--write`, S5b)
- **사실**: 메인이 prompt에 문서 원문을 넣으면 메인이 읽은 것이다. Verifier는 Bash가 없어 `git diff`를 못 돌린다.
- **제안**: 문서는 경로만 전달, diff는 `git diff > <file>` 리다이렉트 후 경로 전달.
- **2차**: 경로 전달 타당. diff 범위 문제는 Q14로 이동.

#### Q13 — resume은 이전 가설·작성 이력을 유지 (신규, 막음: S2, S5a, S5b)
- **사실**: rescue(`--resume-last`/`--resume`), verify·research(`resume` 키워드 → `--resume-last`)는 이전 Codex 스레드를 잇는다(`lib/codex.mjs:1104` `thread/resume`). 새 프롬프트에서 가설을 빼도 이전 턴에 보낸 가설은 스레드에 남는다 → ①이 무력.
- **사실**: `--resume-last`는 현재 Claude 세션의 **가장 최근 task job** 스레드를 고른다 — 스킬 구분 없음(`companion:306-356` `findLatestResumableTaskJob`, `jobClass === "task"`). rescue로 구현한 뒤 verify `resume`을 부르면 같은 Codex 스레드가 자기 작업을 검수한다(maker = checker).
- **2차 제안**: 신규 독립 검수와 후속(resume) 검수의 계약을 구분. 명시적 resume 요청은 보존하되 결과에 독립성 보장을 붙이지 않고 차이를 표시.

#### Q5 — research 검증 범위 (막음: S4, S5b)
- **사실**: Read·Grep로는 URL·출처를 확인할 수 없다. topic-only는 Read할 대상도 없다. 현 Phase 4의 synthesis("Codex가 놓친 것 채우기")를 누가 할지 S5b에 없다.
- **선택지**: (a) research용 agent 파일 분리 + WebFetch 허용 (b) URL 인용은 미검증 라벨 (c) synthesis는 메인이 Verifier JSON만 보고 작성.
- **2차**: 타당. Verifier JSON 집계만으로는 기존 synthesis("Codex가 놓친 정보 보충")를 보존했다고 할 수 없다.

#### Q6 — 열화 모드 트리거와 부분 실패 (막음: S5a, S5b)
- **사실**: `claude -p`도 서브에이전트를 실행하고 완료까지 기다린다(`headless` §Background tasks at exit). "headless = Agent 없음" 전제가 틀려 S5a·S5b의 headless `Self-verified` 수용기준은 이대로면 실패한다.
- **쟁점**: 열화 테스트 방법(제안: `--disallowedTools Agent`). N group 중 일부만 실패할 때 메인 self-verify로 내려가면 편향 예외가 다시 열린다 — 제안: 실패한 group만 `Unverified`.
- **2차**: 타당. Agent 차단과 부분 실패를 별도 조건으로 테스트해야 한다. 자원 부족(Q17)도 별도 조건.

#### Q7 — `--no-preview` 삭제 후 헤드리스 검증 경로 + 종료 코드 (막음: S1·S2·S5a·S5b 검증)
- **사실**: S2 이후 adversarial·rescue·verify·research는 Phase 1.5 AskUserQuestion에서 멈춘다. rescue PROMPT_FILE은 승인 뒤 Phase 2에서 쓰인다(`skills/codex-rescue/SKILL.md` Phase 2) → S1 수용기준 1·2 관측 불가. "fixture를 Phase 3 결과로 주입"하는 방법도 정의가 없다.
- **사실(2차 후 확인)**: `-p`에서 AskUserQuestion은 permission host(예: SDK `canUseTool`)가 있을 때만 제공된다. PreToolUse 훅이 `allow` + `updatedInput.answers`로 답을 주입할 수도 있다(`hooks` §PreToolUse decision control).
- **선택지**: (a) Agent SDK `canUseTool`로 AskUserQuestion에 자동 응답하는 테스트 하네스 (b) S1 골든을 S2 전에 고정 (c) 기타. 플래그 추가는 Out of Scope.
- **2차**: (a)는 가능한 접근(`agent-sdk/user-input`). (b)만으로는 최종 상태의 회귀 검증이 안 풀린다.
- **2차(종료 코드)**: `companion-usage.md` §9의 Bash `exit 1`은 그 Bash 도구 프로세스의 실패이지 부모 `claude -p`의 종료 코드가 아니다. 스펙 D1·S2의 "headless에서 exit 1 감수"는 스킬 지시만으로 성립하지 않는다. 자동화가 비정상 종료를 요구하면 하네스가 결과 상태를 검사해 종료 코드를 정해야 한다.

### 차단 — 설명·운영 계약 (P2)

#### Q17 — 병렬 상한 (신규, 막음: S5a, S5b)
- **사실**: 세션에 서브에이전트 20개가 돌고 있으면 추가 Agent 호출은 `Concurrent subagent limit reached`로 실패하고 재시도하지 말라고 안내한다. `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`로 변경 가능, ultracode 세션은 면제(`sub-agents` §Concurrent subagent limit, v2.1.217+).
- **사실**: 스펙 D3 "상한 없음, 병렬이라 지연 동일"은 이 한도를 반영하지 않는다. 현 S5a 규칙이면 한도에 걸린 group이 Agent 실패 → 열화 모드로 떨어진다.
- **2차 제안**: group 총수는 제한하지 않되 동시 실행을 조절. 자원 부족으로 아직 시작 못 한 group을 곧바로 self-verify나 미검증으로 처리하지 않는다.

#### Q16 — fresh 컨텍스트 범위 과장 (신규, 막음: S4, 용어집 Verifier·ADR 0012 문구)
- **사실**: custom 서브에이전트는 대화 이력은 받지 않지만 CLAUDE.md 계층 전체(`~/.claude/CLAUDE.md`, 프로젝트 규칙, `CLAUDE.local.md`, managed policy)와 git status를 로드한다(`sub-agents` §What loads at startup). Agent의 `fork` 유형은 대화 전체를 상속한다.
- **영향**: 스펙 D3 "입력은 finding + 인용 + 규칙뿐", ADR 0012 Decision "no session history", 용어집 Verifier "nothing from the session"이 부정확하다.
- **2차 제안**: 호출 계약에 custom Verifier(`subagent_type` 지정)·신규 실행을 명시하고, 공유 프로젝트 지침은 격리 범위 밖임을 기록. fresh 분리의 이점은 유지되지만 완전한 정보 격리는 아니다.

#### Q8 — evaluation.md의 저자 시점 절 (막음: S4)
- **사실**: Self-Bias Awareness 외에도 "Cross-Model Comparison"(Claude가 앞서 분석했으면)과 보고서 템플릿의 "Additional Findings"·"Claude additional: N"이 남는다. 메인이 추가 finding을 쓰려면 소스를 읽어야 한다.
- **선택지**: 삭제 / Verifier로 이관 / 유지.
- **2차**: 부분 타당. 과거 분석과의 비교 자체는 기존 컨텍스트만으로도 가능하다. 진짜 문제는 소스 재열람 여부가 아니라 **판정·추가 발견·비교의 담당자가 불명확한 것**이다.

#### Q10 — `autonomy_policy`의 확인 요구 문구 (막음: S1)
- **1차 사실**: 스펙 D2 초안의 `Require confirmation only for external writes, destructive actions, or a material expansion of scope.`는 `approvalPolicy=never`에서 확인 요구 = 턴 종료다.
- **1차 제안**: "그 행동은 하지 않고 최종 보고에 적는다"로 교체.
- **2차**: 위험은 타당, 원인 설명이 틀림. `approvalPolicy=never`가 자연어 질문을 곧바로 종료시키는 것이 아니다. **사실**: companion은 app-server의 서버 요청을 전부 `-32601 Unsupported server request`로 거절하고(`lib/app-server.mjs:155-160`), 결과 상태는 `finalTurn.status === "completed"`면 성공이다(`lib/codex.mjs:754`) → Codex가 질문을 최종 응답으로 내면 **작업은 미완료인데 상태는 성공**. 1차 제안처럼 이미 승인된 행동까지 일괄 보류하는 수정도 피해야 한다.
- **영향**: 스펙 Problem ②·D2 "왜 되는가", S1 "왜 이렇게", 용어집 Autonomy policy의 "a question ends the turn" 설명.

#### Q11 — 유저 원문 vs Claude 호출 판별 (막음: S2)
- **1차 사실**: 가설 제외의 verbatim 예외가 "유저가 직접 쳤는가"에 달렸는데 판별 기준이 없다. 가장 큰 누수(Claude 자체 호출)가 바로 이 경로다.
- **쟁점**: 판별 신호(직전 user 메시지의 slash command 태그 유무 등 — 추측)와 불확실할 때의 기본값.
- **2차**: 부분 타당. `$ARGUMENTS`에 작성자 정보가 없는 건 맞지만 스킬은 `$ARGUMENTS`만 보는 독립 프로세스가 아니라 메인 대화도 본다(`skills` §Available string substitutions). 정확한 문제 = **안정적인 출처 판별 계약이 없다**.

### 조율 — 차단 아님 (착수 직전에 정한다)

#### Q12 — 착수 순서
- **1차 사실**: S1·S2가 rescue·research·verify SKILL.md의 Phase 1·1.5를 함께 고치고, S5a·S5b도 같은 파일의 Phase 4를 고친다.
- **1차 제안**: S3만 병렬, S1 → S2 순차. Q7 결과와 함께 정한다.
- **2차**: 차단점 분류는 과함. 같은 파일 수정은 충돌 위험이지 필연이 아니다 — 순차 편집이나 파일 담당자 지정으로 처리할 구현 조율 문제.

#### R1 — `BashOutput`·`KillShell` 의존 (기존 구현 호환성)
- **사실**: review·adversarial의 `allowed-tools`와 Phase 3 WAIT가 `BashOutput`·`KillShell`에 의존한다(`skills/codex-review/SKILL.md:5,133,143`, adversarial 동일). 현재 공식 도구 목록엔 둘 다 없고, 대기는 출력 파일 `Read`(`TaskOutput`은 deprecated), 종료는 `TaskStop`이다(`tools-reference`). 용어집 Pattern A도 `BashOutput`을 적고 있다.
- **2차**: 016이 만든 문제는 아니지만 S5a 검증 전에 대기·종료 경로를 맞춰야 한다.

#### R2 — 버전 정책 (막음: S6)
- **사실**: `--no-preview` 삭제는 기존 호출을 깬다. 스펙 D6은 "명령 표면·플래그 동일"을 근거로 minor(4.8.0)를 고른다. AGENTS.md: major = breaking interface changes.

#### R3 — `model:` 생략의 의미 (막음: S4)
- **사실**: 생략은 항상 부모 모델이 아니다. `CLAUDE_CODE_SUBAGENT_MODEL` 등 subagent model order가 적용된다(`sub-agents` §Choose a model). frontmatter는 `inherit` 값도 받는다.
- **쟁점**: 부모 모델 고정 상속인가, 사용자의 서브에이전트 모델 설정 존중인가 — 스펙 D3 "서브에이전트 모델: 상속"과 S4를 의도대로 정확히 기술.

### 문구 정리 — 그릴 불필요, 해당 슬라이스 수정 때 반영

- **W1**: S5b 수용기준 "두 SKILL.md에 스크립트 호출 0건" → "S3 인용 검사 스크립트 호출 0건". companion·설정 스크립트는 계속 쓴다.
- **W2**: "verify/research는 이미 구조적으로 독립이었다"(스펙 D3 verify/research 절, S5b 본문) 삭제. 메인이 그 문서를 작성했다면 blind payload로 기억이 지워지지 않는다 — 두 스킬에도 Verifier 적용의 실질 이득이 있다.
- **W3**: "500행 이하", "MUST/NEVER 0건"은 편집 기준으로만 둔다. 독립성·판정 품질의 증거로 세지 않는다.

## Slices (tracer bullets)

의존 순서: S1 · S2 · S3 독립 → S4(S3) → S5a·S5b(S3, S4) → S6(S1, S2, S5a, S5b).

```
S1 ─────────────────────────────┐
S2 ─────────────────────────────┤
S3 ─→ S4 ─→ S5a ────────────────┼─→ S6
          └→ S5b ───────────────┘
```

### S1 — ② 블록 정리: rescue `autonomy_policy`, research 중복 제거 (스토리 5, 6, 7, 16; 결정 D2)

**What to build**: rescue 프롬프트에서 `completeness_contract`·`verification_loop`·`action_safety` 세 블록을 지우고 `autonomy_policy` 한 블록으로 바꾼다. `--write`는 전문(보고형/변경형/확인 필요형 3구간 + follow-through + 소규모 변경 테스트 금지), read-only는 보고형·follow-through 행만 + 기존 `grounding_rules`. research는 `grounding_rules`를 지운다(`structured_output_contract`의 "facts / inferences 분리"와 중복). verify는 손대지 않는다. 남는 모든 블록 옆에 출처 주석(가이드 이름 + 절 이름 + 날짜)을 단다 — 다음 모델 가이드가 나왔을 때 무엇을 재동기화할지 알기 위해서다. 주석은 payload 바깥(heredoc·"copy exactly" 코드블록 밖)에 둔다 — 안에 두면 PROMPT_FILE에 섞여 들어간다. 프리뷰(Phase 1.5)의 블록 목록 설명도 새 집합으로 맞춘다.

왜 이렇게: 세 블록은 같은 말을 반복하고, `action_safety`의 "위험하면 먼저 알려라"는 `approvalPolicy=never`에서 되묻기 = 턴 종료 = 작업 실패로 이어진다. 5.6 가이드 "지시는 한 번만, ask-first 반복은 불필요한 승인 요청을 부른다", Astra 가이드 "되묻기 성향 증가 → bias-to-action 문구 필요".

**Acceptance criteria** (seam: PROMPT_FILE — 결정론):
- [ ] rescue `--write` 고정 입력 → PROMPT_FILE에 `<task>` + `<autonomy_policy>`만, 삭제된 세 태그 0건
- [ ] rescue read-only 고정 입력 → `<task>` + `<autonomy_policy>`(보고형 행 + follow-through 행) + `<grounding_rules>`
- [ ] research 고정 입력 → PROMPT_FILE에 `<grounding_rules>` 0건, 나머지 4블록 골든과 일치
- [ ] verify PROMPT_FILE이 변경 전 골든과 byte 동일
- [ ] 세 스킬 SKILL.md에 블록마다 출처 주석 존재, `gpt-5-4-prompting` 주석은 유지된 블록에만
- [ ] `autonomy_policy` 본문에 되묻기 유발 구절(`call out`, `before taking`, `ask first`, `ask the user`, 확인 요구 문구 — Q10 결과) 0건. 단어 경계로 판정한다 — `task`·`without asking` 같은 부분일치는 해당 없음

**Blocked by**: None — can start immediately.

### S2 — ① 가설 제외 + 프리뷰 항상 + verify focus 인자 (스토리 1~4, 9; 결정 D1)

**What to build**: adversarial(focus)·rescue(task, Claude가 작문할 때)·research(topic)·verify(focus — 신설) 네 스킬의 Phase 1에 **Hypothesis exclusion** 규칙을 넣는다. Claude가 Codex로 보낼 문장을 쓸 때 증거(범위·증상·재현·로그·유저 원문)와 초점(볼 영역)은 남기고 가설(원인 주장, 의심 `file:line` 단정, 기대 답)은 뺀다. 기준은 한 줄 — 주장이 있으면 가설, 영역만 있으면 초점 — 그리고 사례 3~5개를 표로 박는다(예: "login handler 봐줘"=초점 / "auth.ts:42 null check 누락으로 뚫림"=가설 / "빈 비번으로 POST /login 하면 500"=증거). 유저가 직접 친 텍스트는 가설이 있어도 verbatim — 규칙은 Claude의 기본값을 고치는 것이지 유저를 막는 게 아니다. Phase 1.5 프리뷰에 `Excluded (hypothesis):` 줄을 추가해 뺀 것을 보여주고 "Needs changes"로 되돌릴 수 있게 한다. `--no-preview` 플래그를 네 스킬에서 삭제한다(argument-hint, Phase 1 파싱, Phase 1.5 "skip" 문장, `companion-usage.md` 언급) — 분류가 Claude 판단(SOFT)이라 프리뷰가 유일한 검사 창인데 플래그가 그 창을 우회하기 때문이다. headless에서는 §9 규칙대로 AskUserQuestion 실패 → exit 1이며 이것은 감수한다. verify에 positional focus text를 받아 `<task>`의 Focus areas 뒤에 붙인다. verify 파싱 순서: `resume` 키워드 → 문서 경로 → 남은 텍스트 = focus.

지시문 작성 지침: "왜"를 먼저 쓴다 — 검수자에게 답을 주면 검수자는 답을 확인한다(anchoring). 규칙 나열보다 대비 예시가 낫다. 이미 있는 `Original → focus` 변형 예시를 확장하면 된다.

**Acceptance criteria** (seam: 프리뷰 텍스트 + PROMPT_FILE/focus 인자 — 분류는 LM이라 골든 5건):
- [ ] `evals/evals.json`에 가설 포함 입력 5건(초점만 / 가설만 / 혼합 / 유저 원문에 가설 / Claude 자체 호출) + assertion
- [ ] 가설 제외 대상 3건(가설만 / 혼합 / Claude 자체 호출)은 프리뷰에 `Excluded (hypothesis):` 줄이 있고 그 문장이 focus 인자·PROMPT_FILE에 없음
- [ ] "초점만" 입력은 `Excluded` 줄이 비어 있고 focus가 유저 의도를 담음(빈값 아님)
- [ ] 유저 원문 가설 케이스: PROMPT_FILE `<task>`에 원문 verbatim, 프리뷰에 "가설 포함" 표시
- [ ] 네 스킬 SKILL.md·README·`companion-usage.md`에 `--no-preview` 0건
- [ ] verify `codex-verify doc.md "security angle"` → PROMPT_FILE Focus areas에 그 문구 존재, 인자 없으면 기존 골든과 동일
- [ ] 각 SKILL.md 500행 이하 유지

**Blocked by**: None — can start immediately.

### S3 — ③-a 인용 존재·묶음 스크립트 (스토리 10, 13; 결정 D3 단계 2)

**What to build**: `scripts/` 아래 결정론 스크립트 하나. 입력은 Codex 출력 JSON(review/adversarial의 findings 배열, rescue의 인용 목록) + 리포 루트. 출력은 finding마다 `{index, file, line_start, line_end, status: ok|missing|uncited, group_id}` JSON. `uncited`는 인용 자체가 없음, `missing`은 파일이 없거나 줄 범위가 파일 길이를 벗어남. 같은 파일 + 줄 범위 겹침이면 같은 `group_id`. 겹침은 전이로 묶는다(A~B, B~C면 A·B·C가 한 group). `group_id`는 `ok`에만 주고 `missing`·`uncited`는 `null`. `file`은 절대 경로·리포 상대 경로를 모두 받아 리포 상대로 정규화한다. 그 외 판단은 하지 않는다 — 이 스크립트는 fact만 다룬다(`evidence-gates`: fact는 코드, judgment는 AI). 스크립트가 도는 동안 메인 Claude는 소스를 읽지 않는다는 점을 SKILL.md에 설명할 때 근거로 쓰인다.

**Acceptance criteria** (seam: 스크립트 stdout — 결정론, 단위 테스트):
- [ ] fixture Codex JSON 1개(ok 2·missing 1·uncited 1·겹침 2쌍) → 기대 JSON과 일치
- [ ] 겹치는 두 finding이 같은 `group_id`, 같은 파일 다른 범위는 다른 `group_id`
- [ ] 잘못된 JSON 입력 → 비정상 종료 + stderr 메시지, 부분 출력 없음
- [ ] 테스트 스크립트가 `scripts/` 옆에 있고 `python3`만으로 실행

**Blocked by**: None — can start immediately.

### S4 — ③-b Verifier 에이전트 + evaluation.md 재편 (스토리 8, 9, 11, 18; 결정 D3 단계 3)

**What to build**: `agents/verifier.md`를 만든다. 역할: **Finding group** 하나를 판정한다. 입력은 finding 원문 + 인용 + S3 존재 결과 + 판정 규칙 참조. 도구는 Read·Grep만. 출력은 `{classification: Agreed|Disputed|Nuanced, evidence, reason}` JSON 하나. 프롬프트는 3원칙을 따른다 — 기본 판정은 Disputed(의심되면 reject), 원 finding에 commitment 없음(Codex 편도 안 듦), 출력은 JSON만. 문구는 `references/compound-engineering-plugin/.../validator-template.md`를 참고하되 그대로 복사하지 않는다. `references/evaluation.md`는 규칙의 단일 원본으로 남기고 에이전트가 참조한다(두 곳에 복사해 갈라지지 않도록). `evaluation.md`의 "Self-Bias Awareness" 절은 삭제한다 — Verifier에겐 자기 코드가 없어 해당 없고, 열화 모드 라벨이 그 자리를 대신한다. rescue `--write`용 입력 변형(유저 task 원문 + diff, 판정 = 과제 충족·범위 이탈·부작용)과 verify/research용 입력 변형(문서 + Codex 결과, 인용 확인 포함)도 같은 에이전트가 모드 인자로 받는다. `model:`은 박지 않는다(스펙 012).

왜 서브에이전트인가를 파일 상단에 두 문장으로 쓴다: 메인 세션은 그 코드를 쓴 당사자라 옹호할 것이 있고, 지시로는 그 사전 오염을 못 지운다(ADR 0012).

**Acceptance criteria** (seam: 에이전트 JSON — 스키마 + 명백 사례):
- [ ] `evals/evals.json`에 fixture 3건 — 존재하는 인용이 맞는 finding / 존재하지 않는 함수를 인용한 finding / 사실이지만 맥락이 빠진 finding
- [ ] 세 출력 모두 스키마를 만족하는 JSON 한 덩어리, 산문 0건
- [ ] "존재하지 않는 함수 인용" 케이스가 Agreed면 실패
- [ ] 에이전트 프롬프트에 3원칙이 각각 한 번씩 있고, MUST/NEVER 대문자 0건
- [ ] `evaluation.md`에 Self-Bias Awareness 0건, 분류 규칙은 evaluation.md에만 있고 에이전트는 경로로 참조
- [ ] 에이전트 frontmatter에 `model:` 없음, tools는 Read·Grep만

**Blocked by**: S3 — 입출력 계약(`status`, `group_id` 필드명)을 공유.

### S5a — ③-c Phase 4 배선: 코드 경로 3스킬 (스토리 8, 11, 12, 13, 14; 결정 D3 단계 1·4·5)

**What to build**: review·adversarial·rescue의 Phase 4를 교체한다. 메인은 Codex JSON을 파싱해 finding 목록을 뽑고(소스는 안 읽음) → S3 스크립트 실행 → `ok` group마다 Verifier를 병렬로 띄우고 → JSON을 모아 보고서를 쓴다. `missing` → False Positive, `uncited` → Uncited는 스크립트 결과를 그대로 적는다. 판정은 바꾸지 않는다. 보고서 상단에 `Verifier: fresh subagent (N groups)`. Agent 도구가 없거나 실패하면 기존 Phase 4를 메인이 수행하고 `Self-verified — independent sub-task unavailable` 라벨을 단다. rescue `--write`는 finding 대신 diff를 Verifier에 보내고, Verifier가 diff 주변을 Read·Grep으로 볼 수 있음을 명시한다. finding 0개면 Verifier 0개. 크기 임계 없음 — finding 1개여도 띄운다. PreToolUse 훅은 만들지 않는다.

SKILL.md 지시문은 "메인은 집계만 한다, 판정은 Verifier가 한다"를 이유와 함께 쓰고, 기존 "Read ONLY the file:line Codex cited" 절은 열화 모드 절로 옮긴다. Execution Contract 표의 Phase 4 행도 새 구조(집계 + Verifier 기동)로 바꾼다.

**Acceptance criteria** (seam: 저장된 보고서 파일 — `Verifier:` 라벨은 결정론):
- [ ] fixture Codex JSON(S3의 것)을 Phase 3 결과로 주입한 실행에서 보고서에 `Verifier: fresh subagent` + group 수
- [ ] `missing` finding이 보고서에서 False Positive, `uncited`가 Uncited
- [ ] Agent 도구를 막은 실행(headless `claude -p`)에서 보고서에 `Self-verified — independent sub-task unavailable`
- [ ] finding 0개 입력에서 Agent 호출 0회
- [ ] rescue `--write` 실행 보고서에 diff 판정(충족/이탈/부작용) 항목 존재
- [ ] 세 SKILL.md Execution Contract 표 Phase 4 행에 "Read ONLY files/lines Codex cited" 0건
- [ ] 세 SKILL.md 500행 이하

**Blocked by**: S3, S4.

### S5b — ③-c Phase 4 배선: 문서 경로 2스킬 (스토리 8, 11, 12; 결정 D3)

**What to build**: verify·research의 Phase 4를 교체한다. 스크립트는 쓰지 않는다 — 입력이 문서 하나라 Verifier가 헤맬 공간이 없고 섹션/URL 인용은 `file:line`이 아니다. Verifier에 문서 원문 + Codex 결과를 넘기고(메인 컨텍스트는 여전히 문서를 안 본다 — blind payload 유지) 인용 확인까지 Verifier가 한다. 라벨·열화 모드는 S5a와 동일. 이 두 스킬은 이미 구조적으로 독립이었으므로 이득은 "다섯 스킬의 판정 주체가 같다"는 일관성이다.

**Acceptance criteria**:
- [ ] verify 실행 보고서에 `Verifier: fresh subagent`, 메인 컨텍스트에 문서 본문 미노출(Bash stdout에 문서 0줄)
- [ ] research 동일
- [ ] 두 SKILL.md에 스크립트 호출 0건
- [ ] verify SKILL.md(Phase 4·Gotchas)에 Self-Bias / "I authored" 문구 0건
- [ ] headless 실행에서 `Self-verified` 라벨

**Blocked by**: S3, S4 (S3는 계약 어휘만 공유).

### S6 — 마무리: `spark` 삭제, 문서·설명·버전 (스토리 15, 17, 19, 20; 결정 D4, D5, D6)

**What to build**: `apply-codex-config.py`의 `MODEL_ALIASES`에서 `spark`를 지우고 README·rescue SKILL.md의 spark 언급을 지운다 — 스펙 012가 남긴 유일한 모델 지식이며 지금은 캐시에 없는 모델을 가리킨다. README "How a call is translated"의 double-check 단계를 Verifier 구조로, "Independent double-check" 항목을 read/write 양면으로 고쳐 쓴다. `plugin.json`·`marketplace.json` description의 "Claude fact-checks every finding"을 fresh-context verifier 표현으로 바꾼다(둘 일치). `marketplace.json` 4.7.1 → 4.8.0. 용어집·ADR은 그릴에서 이미 갱신됨 — 구현 중 어휘가 바뀌었으면 여기서 맞춘다.

**Acceptance criteria**:
- [ ] `HOME=<tmp> apply-codex-config.py spark ""` → `<tmp>/.codex/config.toml`에 `spark` 그대로, 확장 0건. 실제 `~/.codex/config.toml`은 건드리지 않는다
- [ ] 플러그인 전체에 `gpt-5.3-codex-spark` 0건
- [ ] README에 `--no-preview` 0건, `Verifier` 설명 존재, "holds off reading" 류 구지시문 설명 0건, "Self-bias guardrail" 항목 0건
- [ ] 두 매니페스트 description 일치, "fresh" 또는 "independent verifier" 포함
- [ ] `marketplace.json` 4.8.0
- [ ] `unset CLAUDECODE && claude plugin validate .` 통과

**Blocked by**: S1, S2, S5a, S5b — 문서가 최종 동작을 기술.

## 검증 방법 (공통)

- S2 이후 프리뷰가 항상 떠서 아래 헤드리스 기법이 막힌다 — 경로는 Q7에서 정한다.
- 골든 비교와 헤드리스 실행은 이슈 011의 기법: `claude -p --plugin-dir ./plugins/codex-advisor` 로 스킬을 돌리고 파일 산출물(PROMPT_FILE, 보고서)을 검사. Codex 실제 호출이 필요한 S5a/S5b는 fixture JSON을 Phase 3 결과로 주입하는 경로를 먼저 쓰고, 실 Codex 1회는 마지막에.
- `evals/evals.json`은 skill-creator 스키마(prompt, expected_output, assertions). 스킬별 `<skill>-workspace/`는 커밋하지 않는다.
- 마켓플레이스 설치본과 충돌 방지: `claude plugin disable codex-advisor@claude-code-zero` 후 테스트.

## Out of Scope (스펙 참조)

Official 플러그인 포크·병합, adversarial 프롬프트 수정, PreToolUse 훅, 크기 임계값, AGENTS.md 실측, `--no-preview` 대체 플래그.
