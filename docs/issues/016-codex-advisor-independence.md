# 이슈 016 — codex-advisor 검수자 독립성 복원 구현 (슬라이스 S1~S6)

> 상태: **ready-for-agent** — 구현 착수 전 · 생성: 2026-09-11
> 스펙 (PRD): `docs/specs/016-codex-advisor-independence.md` — 문제 정의, 유저 스토리, 결정 D1~D6, 그릴 확정 사항 전부 스펙 참조. 스펙과 이 문서가 다르면 스펙이 맞다.
> 대상 플러그인: `plugins/codex-advisor/` (v4.7.1 → v4.8.0)
> 용어집: `docs/context/codex-advisor.md` — **Double-check independence / Verifier / Hypothesis exclusion / Finding group / Autonomy policy** · ADR: 0004(전제), 0012(③ 구조)
> 원칙: 강제는 구조로, 판단은 fresh 컨텍스트로, fact는 스크립트로. 지시문은 "왜"를 설명하고 MUST를 남발하지 않는다(skill-creator 가이드).

## Slices (tracer bullets)

의존 순서: S1 · S2 · S3 독립 → S4(S3) → S5a·S5b(S3, S4) → S6(S1, S2, S5a, S5b).

```
S1 ─────────────────────────────┐
S2 ─────────────────────────────┤
S3 ─→ S4 ─→ S5a ────────────────┼─→ S6
          └→ S5b ───────────────┘
```

### S1 — ② 블록 정리: rescue `autonomy_policy`, research 중복 제거 (스토리 5, 6, 7, 16; 결정 D2)

**What to build**: rescue 프롬프트에서 `completeness_contract`·`verification_loop`·`action_safety` 세 블록을 지우고 `autonomy_policy` 한 블록으로 바꾼다. `--write`는 전문(보고형/변경형/확인 필요형 3구간 + follow-through + 소규모 변경 테스트 금지), read-only는 보고형·follow-through 행만 + 기존 `grounding_rules`. research는 `grounding_rules`를 지운다(`structured_output_contract`의 "facts / inferences 분리"와 중복). verify는 손대지 않는다. 남는 모든 블록 옆에 출처 주석(가이드 이름 + 절 이름 + 날짜)을 단다 — 다음 모델 가이드가 나왔을 때 무엇을 재동기화할지 알기 위해서다. 프리뷰(Phase 1.5)의 블록 목록 설명도 새 집합으로 맞춘다.

왜 이렇게: 세 블록은 같은 말을 반복하고, `action_safety`의 "위험하면 먼저 알려라"는 `approvalPolicy=never`에서 되묻기 = 턴 종료 = 작업 실패로 이어진다. 5.6 가이드 "지시는 한 번만, ask-first 반복은 불필요한 승인 요청을 부른다", Astra 가이드 "되묻기 성향 증가 → bias-to-action 문구 필요".

**Acceptance criteria** (seam: PROMPT_FILE — 결정론):
- [ ] rescue `--write` 고정 입력 → PROMPT_FILE에 `<task>` + `<autonomy_policy>`만, 삭제된 세 태그 0건
- [ ] rescue read-only 고정 입력 → `<task>` + `<autonomy_policy>`(보고형 행) + `<grounding_rules>`
- [ ] research 고정 입력 → PROMPT_FILE에 `<grounding_rules>` 0건, 나머지 4블록 골든과 일치
- [ ] verify PROMPT_FILE이 변경 전 골든과 byte 동일
- [ ] 세 스킬 SKILL.md에 블록마다 출처 주석 존재, `gpt-5-4-prompting` 주석은 유지된 블록에만
- [ ] `autonomy_policy` 본문에 "ask", "call out", "before taking" 류 되묻기 유발 문구 0건

**Blocked by**: None — can start immediately.

### S2 — ① 가설 제외 + 프리뷰 항상 + verify focus 인자 (스토리 1~4, 9; 결정 D1)

**What to build**: adversarial(focus)·rescue(task, Claude가 작문할 때)·research(topic)·verify(focus — 신설) 네 스킬의 Phase 1에 **Hypothesis exclusion** 규칙을 넣는다. Claude가 Codex로 보낼 문장을 쓸 때 증거(범위·증상·재현·로그·유저 원문)와 초점(볼 영역)은 남기고 가설(원인 주장, 의심 `file:line` 단정, 기대 답)은 뺀다. 기준은 한 줄 — 주장이 있으면 가설, 영역만 있으면 초점 — 그리고 사례 3~5개를 표로 박는다(예: "login handler 봐줘"=초점 / "auth.ts:42 null check 누락으로 뚫림"=가설 / "빈 비번으로 POST /login 하면 500"=증거). 유저가 직접 친 텍스트는 가설이 있어도 verbatim — 규칙은 Claude의 기본값을 고치는 것이지 유저를 막는 게 아니다. Phase 1.5 프리뷰에 `Excluded (hypothesis):` 줄을 추가해 뺀 것을 보여주고 "Needs changes"로 되돌릴 수 있게 한다. `--no-preview` 플래그를 네 스킬에서 삭제한다(argument-hint, Phase 1 파싱, Phase 1.5 "skip" 문장, `companion-usage.md` 언급) — 분류가 Claude 판단(SOFT)이라 프리뷰가 유일한 검사 창인데 플래그가 그 창을 우회하기 때문이다. headless에서는 §9 규칙대로 AskUserQuestion 실패 → exit 1이며 이것은 감수한다. verify에 positional focus text를 받아 `<task>`의 Focus areas 뒤에 붙인다.

지시문 작성 지침: "왜"를 먼저 쓴다 — 검수자에게 답을 주면 검수자는 답을 확인한다(anchoring). 규칙 나열보다 대비 예시가 낫다. 이미 있는 `Original → focus` 변형 예시를 확장하면 된다.

**Acceptance criteria** (seam: 프리뷰 텍스트 + PROMPT_FILE/focus 인자 — 분류는 LM이라 골든 5건):
- [ ] `evals/evals.json`에 가설 포함 입력 5건(초점만 / 가설만 / 혼합 / 유저 원문에 가설 / Claude 자체 호출) + assertion
- [ ] 5건 모두 프리뷰에 `Excluded (hypothesis):` 줄이 있고 그 문장이 focus 인자·PROMPT_FILE에 없음
- [ ] "초점만" 입력은 `Excluded` 줄이 비어 있고 focus가 유저 의도를 담음(빈값 아님)
- [ ] 유저 원문 가설 케이스: PROMPT_FILE `<task>`에 원문 verbatim, 프리뷰에 "가설 포함" 표시
- [ ] 네 스킬 SKILL.md·README·`companion-usage.md`에 `--no-preview` 0건
- [ ] verify `codex-verify doc.md "security angle"` → PROMPT_FILE Focus areas에 그 문구 존재, 인자 없으면 기존 골든과 동일
- [ ] 각 SKILL.md 500행 이하 유지

**Blocked by**: None — can start immediately.

### S3 — ③-a 인용 존재·묶음 스크립트 (스토리 10, 13; 결정 D3 단계 2)

**What to build**: `scripts/` 아래 결정론 스크립트 하나. 입력은 Codex 출력 JSON(review/adversarial의 findings 배열, rescue의 인용 목록) + 리포 루트. 출력은 finding마다 `{index, file, line_start, line_end, status: ok|missing|uncited, group_id}` JSON. `uncited`는 인용 자체가 없음, `missing`은 파일이 없거나 줄 범위가 파일 길이를 벗어남. 같은 파일 + 줄 범위 겹침이면 같은 `group_id`. 그 외 판단은 하지 않는다 — 이 스크립트는 fact만 다룬다(`evidence-gates`: fact는 코드, judgment는 AI). 스크립트가 도는 동안 메인 Claude는 소스를 읽지 않는다는 점을 SKILL.md에 설명할 때 근거로 쓰인다.

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

SKILL.md 지시문은 "메인은 집계만 한다, 판정은 Verifier가 한다"를 이유와 함께 쓰고, 기존 "Read ONLY the file:line Codex cited" 절은 열화 모드 절로 옮긴다.

**Acceptance criteria** (seam: 저장된 보고서 파일 — `Verifier:` 라벨은 결정론):
- [ ] fixture Codex JSON(S3의 것)을 Phase 3 결과로 주입한 실행에서 보고서에 `Verifier: fresh subagent` + group 수
- [ ] `missing` finding이 보고서에서 False Positive, `uncited`가 Uncited
- [ ] Agent 도구를 막은 실행(headless `claude -p`)에서 보고서에 `Self-verified — independent sub-task unavailable`
- [ ] finding 0개 입력에서 Agent 호출 0회
- [ ] rescue `--write` 실행 보고서에 diff 판정(충족/이탈/부작용) 항목 존재
- [ ] 세 SKILL.md 500행 이하

**Blocked by**: S3, S4.

### S5b — ③-c Phase 4 배선: 문서 경로 2스킬 (스토리 8, 11, 12; 결정 D3)

**What to build**: verify·research의 Phase 4를 교체한다. 스크립트는 쓰지 않는다 — 입력이 문서 하나라 Verifier가 헤맬 공간이 없고 섹션/URL 인용은 `file:line`이 아니다. Verifier에 문서 원문 + Codex 결과를 넘기고(메인 컨텍스트는 여전히 문서를 안 본다 — blind payload 유지) 인용 확인까지 Verifier가 한다. 라벨·열화 모드는 S5a와 동일. 이 두 스킬은 이미 구조적으로 독립이었으므로 이득은 "다섯 스킬의 판정 주체가 같다"는 일관성이다.

**Acceptance criteria**:
- [ ] verify 실행 보고서에 `Verifier: fresh subagent`, 메인 컨텍스트에 문서 본문 미노출(Bash stdout에 문서 0줄)
- [ ] research 동일
- [ ] 두 SKILL.md에 스크립트 호출 0건
- [ ] headless 실행에서 `Self-verified` 라벨

**Blocked by**: S3, S4 (S3는 계약 어휘만 공유).

### S6 — 마무리: `spark` 삭제, 문서·설명·버전 (스토리 15, 17, 19, 20; 결정 D4, D5, D6)

**What to build**: `apply-codex-config.py`의 `MODEL_ALIASES`에서 `spark`를 지우고 README·rescue SKILL.md의 spark 언급을 지운다 — 스펙 012가 남긴 유일한 모델 지식이며 지금은 캐시에 없는 모델을 가리킨다. README "How a call is translated"의 double-check 단계를 Verifier 구조로, "Independent double-check" 항목을 read/write 양면으로 고쳐 쓴다. `plugin.json`·`marketplace.json` description의 "Claude fact-checks every finding"을 fresh-context verifier 표현으로 바꾼다(둘 일치). `marketplace.json` 4.7.1 → 4.8.0. 용어집·ADR은 그릴에서 이미 갱신됨 — 구현 중 어휘가 바뀌었으면 여기서 맞춘다.

**Acceptance criteria**:
- [ ] `apply-codex-config.py spark ""` → config.toml에 `spark` 그대로, 확장 0건
- [ ] 플러그인 전체에 `gpt-5.3-codex-spark` 0건
- [ ] README에 `--no-preview` 0건, `Verifier` 설명 존재, "holds off reading" 류 구지시문 설명 0건
- [ ] 두 매니페스트 description 일치, "fresh" 또는 "independent verifier" 포함
- [ ] `marketplace.json` 4.8.0
- [ ] `unset CLAUDECODE && claude plugin validate .` 통과

**Blocked by**: S1, S2, S5a, S5b — 문서가 최종 동작을 기술.

## 검증 방법 (공통)

- 골든 비교와 헤드리스 실행은 이슈 011의 기법: `claude -p --plugin-dir ./plugins/codex-advisor` 로 스킬을 돌리고 파일 산출물(PROMPT_FILE, 보고서)을 검사. Codex 실제 호출이 필요한 S5a/S5b는 fixture JSON을 Phase 3 결과로 주입하는 경로를 먼저 쓰고, 실 Codex 1회는 마지막에.
- `evals/evals.json`은 skill-creator 스키마(prompt, expected_output, assertions). 스킬별 `<skill>-workspace/`는 커밋하지 않는다.
- 마켓플레이스 설치본과 충돌 방지: `claude plugin disable codex-advisor@claude-code-zero` 후 테스트.

## Out of Scope (스펙 참조)

Official 플러그인 포크·병합, adversarial 프롬프트 수정, PreToolUse 훅, 크기 임계값, AGENTS.md 실측, `--no-preview` 대체 플래그.
