# rubber-duck-tutor 재설계: gate 거부 → ship-point confrontation (v3.0.0)

> 상태: 구현 중 — S1~S8·S10·S11·S14 완료(2026-07-06 세션 — S6 잔여 검증 + S7 config 다이얼 + S8
> session-scoping + S10 confrontation telemetry + S11 blind-spot 정조준 구현·수동 테스트 완료; S8·S10은
> 이번 세션 시작 시 이미 커밋됨), **S9(정체성 재작성)는 S12 대기 — 다음은 S12부터**(S10·S11이 S12의
> 전제라 순서대로 먼저 잡음) · 생성: 2026-06-21 · 확장:
> 2026-07-04 (위키 그릴 — S10~S13 추가) · 수정: 2026-07-05 (S4 피벗 — ducking은 스킬 아닌 `engine.md`, ADR
> 0003 참조 / S5 구현 중 S14 신설 — 덕 페르소나 대사 전면 영어화)
> ADR: `docs/adr/0003-duck-rejects-gates-confronts-at-ship-point.md`
> 용어집: `docs/context/rubber-duck-tutor.md`

v2.4.1 → 3.0.0 재설계의 수직 슬라이스 이슈. 각 슬라이스는 독립적으로 잡아서 단독 검증 가능. 결정은
락됨 — 위의 ADR·용어집 참조. 아래 어휘는 도메인 용어집을 따름(ducking, confrontation, ship-point
confrontation, artifact-level vs code-level comprehension, shared ship budget).

## 다음 세션 시작점 (핸드오프, 2026-07-06)

### First Action

S12(Ignore streak → scoreboard 강등)부터 시작 — 블로커 S10·S11 완료, 즉시 착수 가능. 이후 S13 → S9 순.

### Context

2026-07-06 세션에서 S6 잔여 검증·S7·S8·S10·S11을 순서대로 구현·수동 테스트·커밋까지 마쳤다(git log 참조).
유저 요청대로 슬라이스 끝나면 멈추고 보고하는 리듬 유지 중 — S11에서 정지.

이어갈 때 참고할 것:
- **S7 jq footgun**: `.key // default`는 JSON `false`를 삼킨다 — boolean 다이얼(`enabled`)은
  raw-value 비교로 처리(`hooks/lib.sh`의 `duck__is_enabled` 참조). 새 config 키 추가 시 재확인.
- **S8↔S11 파서 공유 — 해소됨**: 재사용 안 하기로 결정. `session-edits.sh`는 *AI가 편집한 파일*을
  뽑는 스크립트라 S11이 필요로 하는 *유저의 논의/열람 흔적*과는 다른 신호이고, 결정적으로 ship-point
  confrontation은 push/PR을 만든 바로 그 대화 턴에서 발사되므로(컴팩션 없는 한) 모델이 이미 대화
  전체를 컨텍스트로 갖고 있어 재파싱이 불필요 — `duck-verify`(S8)는 편집을 못 본 새 컨텍스트에서
  호출될 수 있다는 게 다른 점. 근거는 `engine.md`의 "Risk Taxonomy" 섹션 후반부에 기록.
- **S10에서 잡은 버그**: ship 훅에서 `set -u` 아래 `${CLAUDE_PLUGIN_ROOT}`를 무가드로 참조하면 훅
  전체가 죽어 confrontation이 안 나갈 수 있었음 — `[[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]]` 가드로 고침
  (`session-start.sh`의 `${CLAUDE_ENV_FILE:-}` 선례 재사용). S12도 훅에 새 Bash 호출 추가 시 이
  가드 패턴 따를 것.
- **S10·S11 설계 판단(확정 패턴)**: ship confrontation은 `engine.md`를 안 읽는 경로다(ADR 0003·S4 —
  훅의 `additionalContext`가 자기완결적 지시문). S10의 outcome 로깅 지시, S11의 risk taxonomy 요약
  모두 훅 안에 직접 넣었고 `engine.md`에는 사람이 읽는 canonical 사본만 남겼다("keep both copies in
  sync" 주석 첨부). **S12도 이 패턴을 따를 것** — 더는 열린 질문 아님: ignore-streak 계산과
  scoreboard 지시 전부 훅 스크립트(`post-push.sh`/`post-pr.sh`) 안에서 결정론적으로 처리.
- **S11 구현 요지**: 두 ship 훅의 `additionalContext`를 "artifact 나열 → 6종 risk 판정(judgement
  call) → 대화 맥락 기반 engagement 판정 → 고위험×미관여 1건에 interface-facts 질문, 없으면 기존
  artifact-level 질문 폴백" 5단계 지시로 교체. risk taxonomy 6종 고정 목록은 `engine.md`에 canonical
  사본으로 문서화(`code-review` smell-baseline 형식 차용). 새 스크립트·새 Bash 권한 추가 없음 — 전부
  모델 인라인 판단이라 `duck-verify` 계열과 달리 `allowed-tools`에 손댈 필요가 없었음.

무관한 변경(손대지 말 것): `plugins/vision-powers/skills/plugin-visual/SKILL.md`,
`plugins/vision-powers/skills/context-health-visual/SKILL.md` — vision-powers 계열 작업, rubber-duck-tutor와 무관.

### Current Progress

S1-S8·S10·S11·S14 완료, S9·S12·S13 남음(git log 참조). S11 신규/변경 파일:
`hooks/post-push.sh`·`hooks/post-pr.sh`(artifact-level 단일 질문 → risk×engagement triage 지시로
교체, S10의 telemetry fire/outcome 로직·rate-limit·가드는 그대로 보존),
`skills/ducking/engine.md`(신설 "Risk Taxonomy (Ship-Point Triage)" 섹션 — 6종 고정 목록 + engagement
판단 근거 기록) — 전부 `plugins/rubber-duck-tutor/` 아래. 새 스크립트 없음.

### 핵심 파일 포인터

- config — 훅: `hooks/lib.sh`의 `duck__config_get`/`duck__is_enabled`; 스킬: `skills/ducking/scripts/read-config.sh`
- 트랜스크립트 경로 — 심기(훅): `hooks/session-start.sh`; 소비(스킬): `skills/ducking/scripts/session-edits.sh`
- Confrontation telemetry(S10) — 기록: `skills/ducking/scripts/log-telemetry.sh`; 조회:
  `skills/ducking/scripts/telemetry-summary.sh`; 로그: `${CLAUDE_PLUGIN_DATA}/telemetry.jsonl`. S12의
  ignore streak 계산은 outcome 이벤트의 **순서**(연속 무시 횟수)가 필요 — 이 JSONL의 시간순 append
  특성에 의존하게 될 것.
- Risk taxonomy(S11) — canonical 문서: `skills/ducking/engine.md`의 "Risk Taxonomy (Ship-Point
  Triage)" 섹션; 실제 판정 지시는 `hooks/post-push.sh`·`hooks/post-pr.sh`의 `additionalContext`에
  조건절 요약으로 내장(엔진 비참조 원칙 유지). S12의 scoreboard가 고위험 변경 이름을 나열하려면 이
  훅들의 triage 결과(어떤 artifact가 고위험으로 판정됐는지)를 참조하게 될 것 — 단, 그 판정은 스크립트
  값이 아니라 모델의 그 턴 안 판단이라 셸에서 재조회는 불가능함에 유의(S12의 streak 카운트 자체는
  telemetry.jsonl에서 결정론적으로 셸이 계산하지만, scoreboard 문구의 "고위험 변경 이름"은 모델이
  그 순간 다시 판단해서 채워야 함).

---

## 스킬 경계 (2026-07-04 확정)

duck은 **유저의 이해**만 검증한다. 유저가 직접 쓰는 동료 스킬의 영역을 침범하지 않는다:

- 코드 품질·스멜·스펙 준수 리뷰 → 유저의 `/code-review` 몫. duck 질문은 "당신이 아는가"를 묻지 "코드가 좋은가"를 묻지 않는다.
- 계획·설계 스트레스테스트 → 유저의 `/grilling` 몫. duck-prebuild는 "AI 출력 전에 유저가 먼저 예측했는가"(generation effect)만 담당.
- mattpocock-skills에서 차용하는 것은 문서 형식 패턴(고정 체크리스트: `code-review`의 smell baseline 형식, `codebase-design`의 interface-facts 정의)뿐이며 기능 차용은 없다.

## Dependency graph

```
independent leaves (block nothing):  S1   S2

S3 ──────────┐
             ├─► S7
S4 ──┬───────┘
     └─► S5 ─┬─► S6 ─► S8
             └─► S9

2026-07-04 확장 (텔레메트리·정조준 레이어):

S3, S4 ─► S10 ─► S12
S3, S4 ─► S11 ─┬─► S12
               └─► S13

S10, S11, S12 ─► S9   (README가 S10~S12 기능을 기술하므로)
```

선행 블로커 없는 슬라이스(S1, S2, S3, S4)는 즉시 시작 가능. 버전 처리: S1–S13 재설계 전체가 한
릴리즈로 배포 — 중간 슬라이스는 `marketplace.json`을 범프하지 않음. `3.0.0`으로의 단일 범프는 S9에서
발생(breaking: `/duck-design`·`/duck-plan` 제거). S10–S13도 같은 3.0.0 릴리즈에 포함 — 릴리즈는
마지막 슬라이스 완료 후.

권위 있는 블로커는 각 슬라이스의 **Blocked by** 필드. S6는 S5를 거쳐 S4를 전이적으로 상속; S1·S2는
아무것도 막지 않는 순수 리프.

---

## S1 — 거짓 /branch · /resume 폴백 제거 ✅ 완료 (2026-07-05)

**Phase:** 1 · **Blocked by:** 없음 — 즉시 시작 가능.

### What to build
`/branch`와 `/resume`는 Claude Code 빌트인(`/branch [name]`, `/resume [session]`,
alias `/continue`). 플러그인은 현재 이들을 외부 플러그인(`lab-harness-zero`)이 필요한 것처럼
문서화하고, 그 거짓 전제 위에 폴백 분기를 얹음. 폴백 분기와 외부 플러그인 선행조건을 제거하고
"빌트인, 항상 사용 가능"으로 단순화.

### Acceptance criteria
- [x] 어떤 플러그인 문서도 `/branch`·`/resume`가 외부 플러그인을 요구한다고 주장하지 않음.
- [x] "/branch·/resume 사용 불가 시" 폴백 분기 제거됨.
- [x] README Prerequisites가 외부 플러그인 의존성을 더는 나열하지 않음.

### Blocked by
없음 — 즉시 시작 가능.

---

## S2 — 경로 기반 문서 트리거 ✅ 완료 (2026-07-05)

**Phase:** 1 · **Blocked by:** 없음 — 즉시 시작 가능.

### What to build
문서 트리거는 현재 **파일명**(`adr*.md`)으로 매칭해, 표준 번호형 ADR(`0001-...md`)을 조용히 놓침 —
이 레포 자신의 ADR 포함. **경로 기반** 매칭(`docs/adr/`, `docs/plans?/`, `docs/specs?/`,
`docs/rfcs?/`)으로 전환하되 파일명 폴백, 커스텀 경로 regex용 선택적 override 키 하나, 그리고 footgun
폴백(잘못된 override regex는 트리거를 끄지 않고 기본값으로 되돌림)을 둠.

override 키는 `${CLAUDE_PLUGIN_DATA}/config.json`에 산다 — S2는 이 키 하나만 소유하고,
`enabled`·기본 강도 키는 S7 소유(S5/S9식 키 단위 소유권 분리로 write-write 충돌 회피). config 파일
부재·파손 시 기본 경로 집합으로 동작.

### Acceptance criteria
- [x] 번호형 ADR(`docs/adr/0003-....md`) 작성 시 트리거 발사.
- [x] 파일명 스타일(`adr-foo.md`)도 폴백으로 여전히 매칭.
- [x] 잘못된 override regex는 기본 경로 집합으로 폴백; 트리거가 조용히 죽지 않음.

### Blocked by
없음 — 즉시 시작 가능.

---

## S3 — Ship 훅: shared ship budget + suggest→confront ✅ 완료 (2026-07-05)

**Phase:** 1 · **Blocked by:** 없음 — 즉시 시작 가능.

### What to build
ship 훅에 두 가지 변경. (1) **Shared ship budget**: `{git push, gh pr create, glab mr create}`는
세션당 최대 한 번 ship-point confrontation 발사 — 먼저 발사한 게 이김 — 그래서 범용 `git push`
신호가 CLI 훅이 놓치는 플랫폼을 중복 발사 없이 커버. (2) **Suggest→confront**: ship 훅의
`additionalContext`가 "suggest /branch + /duck-review"에서 방금 배포한 변경에 대한 인라인 이해
질문 하나(artifact 단위)로 바뀜. 심층 세션은 여전히 branch-first 프레이밍을 받음.

**Explicitly not doing:** ship 스크립트의 인라인 복합 명령 regex는 *의도적* 중복 방어 — `if:` Bash
매처가 이미 `a && b`의 각 하위 명령을 독립적으로 검사하므로, 스크립트 쪽 regex는 belt-and-suspenders지
버그 아님. "단순화"로 제거하지 말 것. alias / `hub` 커버리지(다른 명령 이름)는 별도 저우선 갭, 범위 밖.

### Acceptance criteria
- [x] 세션 첫 ship 액션은 confrontation 하나 발사; 같은 세션 두 번째 ship 액션은 침묵.
- [x] `git push` 단독(`gh`/`glab` 없이)도 confrontation 발사.
- [x] 주입된 컨텍스트는 명령 실행 제안이 아니라 질문으로 confront.

### Blocked by
없음 — 즉시 시작 가능.

---

## S4 — core.md를 `ducking` 엔진으로 승격 ✅ 완료 (2026-07-05, 설계 수정: 엔진은 스킬이 아님)

**Phase:** 2 · **Blocked by:** 없음 — 즉시 시작 가능(단 S5·S6가 이 위에 빌드).

> **2026-07-05 설계 수정 (그릴 세션):** 원안은 "모델 호출 스킬로 승격 + trigger eval 통과"였으나,
> trigger eval 실측 2/8 — 단일턴 도구가 auto-detect형 스킬에 구조적으로 부적합하고, 25% 안전망은
> 가짜 안심만 생산. deterministic-over-clever 원칙에 따라 엔진은 **스킬이 아닌 참조 문서**
> (`skills/ducking/engine.md`)로 확정 — 모드 스킬이 읽어 들이는 공유 콘텐츠. 자동 confront는
> 전적으로 ship-point 훅 담당. ADR 0003 Consequences에 기록. 이에 따라 원안 기준 1(자동 작동)·
> 6(trigger eval)은 대체·폐기.

### What to build
`core.md`의 공유 규칙을 `ducking` 엔진(`skills/ducking/engine.md`)으로 승격 — 모든 모드가 읽는
재사용 이해-규율 엔진. 헬퍼 스크립트(`log-gap.sh`, `recent-gaps.sh`)를 엔진 자체 `scripts/`
디렉터리로 옮기고 옛 위치를 참조하던 모든 경로를 재지정. **일곱 줄**이
`${CLAUDE_PLUGIN_ROOT}/skills/duck/scripts/...`를 하드코딩하므로 재지정해야 함: 다섯 모드 SKILL.md
파일(`duck-design`, `duck-plan`, `duck-verify`, `duck-review`, `duck-orient`)의 `allowed-tools`
줄, `core.md`(이제 엔진)의 in-body 스크립트 경로, 그리고 `duck-orient` 안의 in-body `recent-gaps.sh`
경로(`allowed-tools`와 별개 줄). 놓친 경로는 Bash 권한 불일치로 조용히 실패하므로, 아래 grep이 진짜
게이트.

**2026-07-04 보강 — 관대 채점 금지(skeptical grading):** 엔진 규칙에 명시 — 유저의 모호하거나
불완전한 답변을 정답 처리하지 않는다. 틀리면 틀렸다고 직설하고 나서 이유를 탐구한다(learning-science
"Dynamic Testing": 정정 없는 오류는 학습 효과 없음). 근거: Anthropic harness 연구 — 에이전트는
산출물 평가에 체계적으로 관대하며, 코드를 쓴 같은 모델이 이해 질문의 채점자까지 겸하므로 물렁해질
위험이 구조적.

~~**2026-07-04 보강 — 발동률 검증(trigger eval)**~~ — 2026-07-05 폐기. 측정은 수행함(2/8);
결과가 "모델 재량 발동 위에 원칙 A를 얹지 말라"는 설계 신호였고, 엔진의 스킬 지위 자체를 제거하는
것으로 응답. 상세는 ADR 0003.

### Acceptance criteria
- [x] `ducking` 엔진 문서가 존재하고(`skills/ducking/engine.md`, 스킬 아님) 모든 모드가 읽어 들임.
- [x] 헬퍼 스크립트가 엔진의 새 `scripts/` 경로에서 실행됨.
- [x] `grep -rn 'skills/duck/scripts'`가 라이브 참조 없음 반환 — 일곱 재지정 줄 모두 갱신됨. 단 역사
      문서(`docs/handoff`, `docs/issues` — 이 이슈 자신이 문자열 포함)는 제외.
- [x] 어떤 스킬·참조도 옛 `core.md` 경로를 가리키지 않음(grep 깨끗).
- [x] 엔진에 관대 채점 금지 규칙 존재 — 모호한 답변을 정답 처리하지 않음.
- [x] ~~trigger eval 발동률 측정·통과~~ → 엔진이 스킬이 아니게 되어 대상 소멸(위 설계 수정 참조).

### Blocked by
없음 — 즉시 시작 가능.

---

## S5 — duck-design + duck-plan을 `duck-prebuild`로 병합

**Phase:** 2 · **Blocked by:** S4.

### What to build
두 before-build 모드를 단일 `duck-prebuild` 스킬로 합침 — 예측-우선 설계 스케치(generation effect)와
계획/결정 검토를 한 모드에서 모두 커버. 옛 스킬 둘을 삭제하고 **모든 라이브 참조**에 리네임을 전파해
죽은 명령 포인터가 남지 않게 함. 참조 집합은 핸드오프 체크리스트 기록보다 큼 — 고정 목록이 아니라
`grep -rn 'duck-design\|duck-plan'`이 권위 있는 게이트. 알려진 라이브 사이트:

- `duck` 라우터 SKILL.md — description + `/duck-design`·`/duck-plan`으로 라우팅하는 mode-map 행
- 형제 교차참조 — `duck-verify`·`duck-review` SKILL.md description 둘 다 `/duck-plan` 명시
- plan/doc 훅 — `post-plan.sh`, `post-write-plan.sh`(이들의 `additionalContext`가 `/duck-plan` 언급)
- 플러그인 `README.md` — 명령 표, Quick Start, hooks 문단
- **레포 루트 `README.md`·`README.ko.md`** — 마켓플레이스 명령 목록(핸드오프 체크리스트가 놓침)
- 엔진 본문 — `skills/ducking/engine.md`(S4에서 `core.md`가 이걸로 됨, 스킬 아닌 참조 문서)의 모드 목록이 `/duck-design`·`/duck-plan` 열거

범위 경계: `plugin.json` / `marketplace.json`의 **description** 산문은 S9(정체성 재작성)에서 다시
씀, 그래서 S5는 그 두 문자열을 **건드리지 않음** — S5/S9 write-write 충돌 회피. S5는 두 매니페스트
description을 제외한 모든 곳의 리네임을 소유.

### Acceptance criteria
- [x] `/duck-prebuild`가 두 before-build 흐름을 모두 실행.
- [x] `/duck-design`·`/duck-plan` 스킬이 더는 존재하지 않음.
- [x] `grep -rn 'duck-design\|duck-plan'`가 라이브 참조 없음 반환 — **단** 두 매니페스트
      description(S9 소유)과 역사 문서(`docs/handoff`, `docs/issues`, `docs/adr`) 제외.

### Blocked by
S5는 S4에 의존(래퍼가 `ducking` 엔진 문서를 읽어 들임).

---

## S6 — 호출 일관성 + 얇은 래퍼

**Phase:** 2 · **Blocked by:** S4, S5.

> **2026-07-05 전제 수정:** 원안은 "정확히 한 스킬만 모델 호출(`ducking`)"이었으나, S4 설계 수정으로
> `ducking`은 스킬이 아님(참조 문서). 따라서 목표는 **모델 호출 스킬 0개** — 자동 개입 경로는
> ship-point 훅뿐(ADR 0003). 모델 호출 누수 둘(`duck-design`, `duck` 라우터)의
> `disable-model-invocation: true` 추가는 2026-07-05 그릴 세션에서 선반영 완료.

### What to build
모델 호출 스킬 **0개**; 모든 유저 대면 모드(`duck-prebuild`, `duck-verify`, `duck-review`,
`duck-orient`)와 `duck` 라우터는 유저 호출·**얇게** 됨 — 단계별 프레이밍만 설정하고 엔진
(`skills/ducking/engine.md`)을 읽어 들임, 중복 루프 로직 없음.

### Acceptance criteria
- [x] 모델 호출 가능 스킬 0개 — 전 스킬 `disable-model-invocation: true` (2026-07-05 선반영).
- [x] 어떤 유저 대면 래퍼도 엔진 루프를 중복하지 않음 — 각자 엔진 문서를 읽어 들임 (2026-07-06 검증: `duck`,
      `duck-prebuild`, `duck-verify`, `duck-review`, `duck-orient` 다섯 SKILL.md 모두 "Read first" 링크로
      `../ducking/engine.md`를 참조할 뿐, persona·Wait-for-answer·Skeptical Grading·Session Wrap-up 등
      루프 로직 원문을 재기술하지 않음. 각 파일은 모드 고유 flow만 서술).
- [x] 이전 `duck-design` 자동 팝 동작이 래퍼에서 더는 발생하지 않음 (flag 선반영으로 해소).

### Blocked by
S6는 S4·S5에 의존.

---

## S7 — Config 다이얼

**Phase:** 3 · **Blocked by:** S3, S4.

### What to build
`${CLAUDE_PLUGIN_DATA}/config.json`에 영속 config — `enabled`(기본 켜짐; 마감일엔 끔)과 기본
강도(`quick` / `standard` / `deep`). 명시적 `.enabled == false` 체크 사용(`//`-식 footgun 방어).
ship 훅과 스킬 둘 다 준수 — `enabled: false`면 전부 침묵. S2가 같은 파일에 문서 트리거 override 키를
먼저 두었을 수 있음 — S7은 자기 키만 추가하고 기존 키를 보존.

### Acceptance criteria
- [x] `enabled: false`면 ship-point confrontation이 발사 안 되고 스킬은 no-op (2026-07-06: `hooks/lib.sh`의
      `duck__is_enabled`를 4개 훅 — `post-push.sh`·`post-pr.sh`·`post-plan.sh`·`post-write-plan.sh` —
      모두 `duck__init` 직후에서 체크; 엔진 `skills/ducking/engine.md`의 신설 "Config Check" 섹션이 모든
      모드의 첫 동작으로 `read-config.sh enabled true`를 실행해 `false`면 한 줄 안내 후 정지).
- [x] 기본 강도를 `ducking` 엔진이 읽음 (Intensity Scaling 섹션이 세션당 한 번
      `read-config.sh defaultIntensity standard`를 실행해 시작 레벨을 정함).
- [x] config 파일이 없거나 잘못되면 크래시 대신 enabled / standard 기본값 (수동 테스트: 파일 없음·malformed
      JSON·jq 없는 환경 모두 `read-config.sh`가 `true`/`standard` 폴백 반환, 훅의 `duck__is_enabled`도
      전부 0(enabled) 반환 — jq `//` 연산자가 명시적 `false`를 falsy로 삼켜버리는 footgun을 피하려
      `enabled` 전용 raw-value 비교 로직을 훅·스킬 양쪽에 별도 구현).

S2가 먼저 둔 `docTriggerPathRegex` 키는 그대로 보존됨(`post-write-plan.sh` 통합 테스트로 확인) — 두 config
키가 write-write 충돌 없이 공존.

### Blocked by
S7는 S3(훅이 `enabled`를 읽어야)·S4(엔진이 강도를 읽음)에 의존.

---

## S8 — duck-verify의 session-scoping

**Phase:** 3 · **Blocked by:** S6.

### What to build
`duck-verify`는 `git diff`가 보여주는 것 너머 *이번 세션*에 만든 편집을 잡아야 함 — 세션 전체
트랜스크립트에서 `Edit`/`Write`/`MultiEdit`/`NotebookEdit`를 파싱(no-numb gate의 기법 차용 — 단
no-numb은 마지막 유저 프롬프트 이후만 보지만, 여기는 수락 기준이 요구하는 대로 세션 전체가 윈도우).
방어적으로 파싱: 트랜스크립트 포맷 변경 시 크래시 없이 우아하게 저하.

### Acceptance criteria
- [x] 이번 세션 앞서 만든 미커밋 편집을 `duck-verify`가 드러냄 (`session-edits.sh`가 트랜스크립트에서
      Edit/Write/MultiEdit/NotebookEdit 대상 파일을 뽑아 `git diff` 결과와 합침 — 실 트랜스크립트로
      수동 검증: 3개 파일 정확히 추출·중복제거).
- [x] `git diff`가 깨끗할 때(세션 편집 이미 커밋)도 동작 (`session-edits.sh`는 `git diff`와 독립적으로
      트랜스크립트만 읽으므로 git 상태와 무관하게 세션 편집 목록을 반환).
- [x] 파싱 불가 트랜스크립트는 에러 대신 `git diff` 경로로 저하 (수동 테스트 4종: 트랜스크립트 없음,
      존재하지 않는 파일, 깨진 줄 섞인 JSONL, jq 부재 PATH — 전부 빈 출력 + exit 0. `jq -R 'fromjson?'`로
      줄 단위 파싱해 한 줄이 깨져도 전체 실패로 번지지 않음).

### Blocked by
S8은 S6에 의존(`duck-verify` 래퍼 확정됨).

---

## S9 — 정체성 재작성 + 3.0.0 범프

**Phase:** 3 · **Blocked by:** S5, S10–S12.

### What to build
README, `plugin.json`, `marketplace.json`에서 플러그인 정체성 재작성: AI 코딩 라이프사이클 전체에
걸친 이해-유지 레이어 — 동료 스킬(grill-with-docs, `/branch`)이 있으면 병합되고 없으면 단독 동작,
after-build 전용으로 좁히지 않음. S9는 `plugin.json`·`marketplace.json`의 **description** 문자열의
**유일 작성자**(S5가 의도적으로 안 건드림), 그래서 제거된 `/duck-design`·`/duck-plan` 이름이 그 두
매니페스트에서 최종적으로 빠지는 곳이 이 재작성. 버전을 `3.0.0`으로 범프(breaking:
`/duck-design`·`/duck-plan` 제거). 로컬 소스 플러그인이라 버전은 `marketplace.json`에만 존재.

**2026-07-04 노트:** README 재작성에 S10~S12 기능(confrontation telemetry, blind-spot 정조준,
scoreboard)도 반영. 스킬 경계 절(코드 리뷰·계획 그릴 불침범)도 README에 한 줄로.

### Acceptance criteria
- [ ] README와 두 매니페스트가 라이프사이클 전반 정체성을 기술; after-build 전용 프레이밍 없음.
- [ ] description은 현재 명령만 나열(제거된 `/duck-design`, `/duck-plan` 없음).
- [ ] `marketplace.json` 버전이 `3.0.0`.

### Blocked by
S9는 S5에 의존(명령이 거기서 리네임됨). 2026-07-04 노트가 README에 S10~S12 기능 반영을 요구하므로
S10–S12에도 의존 — S5 직후에 잡으면 미구현 기능을 README가 기술하게 되어 "각 슬라이스 독립 검증"
원칙이 깨짐.

---

## S10 — Confrontation telemetry

**Phase:** 3 · **Blocked by:** S3, S4. · **출처:** 2026-07-04 위키 그릴 (Anthropic "Measuring Skills",
caveman-stats 선례).

### What to build
"플러그인이 동작하는지 모르겠다"는 관측 결함 — 해소한다. confrontation 이벤트를
`${CLAUDE_PLUGIN_DATA}/telemetry.jsonl`에 append: `{ts, trigger, mode(question|scoreboard),
outcome(answered|ignored)}`. 발사 기록은 ship 훅 스크립트가 직접 append(결정론 — 모델 개입 없음);
outcome은 엔진이 대화 흐름을 보고 스크립트 호출로 기록(모델 판단 불가피한 유일 지점). 조회는 경량
스크립트("최근 30일: 발사 N, 응답 M, 무시 K")로, `duck-orient`가 노출. 로그 파일 부재·파손 시 훅과
스킬 모두 조용히 정상 진행 — telemetry 실패가 confrontation을 죽이면 안 됨.

### Acceptance criteria
- [x] ship confrontation 발사 시 훅이 로그 1줄 append — 모델 개입 없이 (`post-push.sh`·`post-pr.sh`가
      `duck__check_rate_limit` 통과 직후 — 즉 confrontation이 실제로 발사될 때만 —
      `log-telemetry.sh fire <push|pr> question`을 직접 호출. rate limit에 걸려 발사가 안 되면 fire도
      안 남음, 수동 테스트로 확인).
- [x] 응답/무시가 outcome으로 기록됨 (훅의 `additionalContext`가 모델에게 사용자 반응을 관찰한 뒤
      `log-telemetry.sh outcome <trigger> answered|ignored`를 호출하도록 지시 — 대화 흐름 판단이
      불가피한 유일 지점이라는 설계 그대로).
- [x] 로그 부재·파손 시 훅·스킬 정상 동작(크래시·침묵사 없음) — 수동 테스트: 로그 파일 없음, 깨진 줄
      섞임, jq 부재 세 경우 모두 `telemetry-summary.sh`가 크래시 없이 0 또는 all-time 카운트로 저하.
      **버그 하나 발견·수정**: 훅 스크립트가 `set -uo pipefail` 아래서 `${CLAUDE_PLUGIN_ROOT}`를 무가드로
      참조하면 그 변수가 비어있는 극단 상황에서 confrontation 출력 전체가 죽을 수 있었음(텔레메트리
      실패가 아니라 훅 전체 크래시) — `session-start.sh`의 `${CLAUDE_ENV_FILE:-}` 가드 선례를 그대로
      따라 `[[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]]`로 감쌈.
- [x] 발사/응답/무시 요약 조회 가능 (`telemetry-summary.sh [days]`, 기본 30일 — "Last 30 days: N fired,
      M answered, K ignored" 한 줄 출력. `duck-orient` Flow 1단계가 세션 시작 시 노출).

### Blocked by
S10은 S3(ship 훅이 기록 주체)·S4(엔진이 outcome 기록)에 의존.

---

## S11 — Blind-spot 정조준 (risk × engagement) ✅ 완료 (2026-07-06)

**Phase:** 3 · **Blocked by:** S3, S4. · **출처:** 2026-07-04 위키 그릴. 유저 결정: "중요한 것만
검증 — 개발자는 코더가 아니라 검수자/아키텍트".

### What to build
ship confrontation의 질문 생성을 2축 triage로 교체. 축 1 — **risk taxonomy**(고정 6종: 동시성,
보안, 성능, 데이터 스키마, 공개 API, 아키텍처 경계; `code-review` 스킬의 smell-baseline 형식 차용 —
이름+판단 힌트, 항상 judgement call). 축 2 — **engagement**: 세션 트랜스크립트에서 유저가 해당
변경을 열람·논의한 흔적(S8의 파싱 기법과 공유 — 둘 중 나중에 잡는 슬라이스가 파서를 공용 lib로 추출).
질문은 **고위험 × 미관여** 상위 1건만, interface-facts 축(invariant·에러 모드·순서 제약·트레이드오프
— `codebase-design`의 interface 정의 차용)으로. 저위험뿐이거나 전부 관여면 기존 artifact-level
질문으로 폴백. 판정은 ship 시점 모델 인라인(서브에이전트 없음 — 훅 레이턴시 예산 준수).

파일 열람률 지표가 **아님**: 안 본 파일 100개여도 전부 저위험이면 침묵. ADR 0003의 artifact-level
grain 유지 — 이 슬라이스는 grain을 바꾸는 게 아니라 **표적 선정**을 바꾼다.

### Acceptance criteria
- [x] 고위험+미관여 변경 존재 시 질문이 그 변경을 지명하고 interface-facts를 묻는다 (`hooks/post-push.sh`·
      `hooks/post-pr.sh`의 `additionalContext`에 5단계 triage 지시 — artifact 나열 → 6종 risk 판정 →
      대화 맥락 기반 engagement 판정 → 고위험×미관여 1건 지명해 invariant/에러모드/순서제약/트레이드오프
      질문 → 동률 시 프로덕션 임팩트 최대 쪽 선택. 서브에이전트 없이 훅 발사 시점 모델 인라인 판정
      — 훅 레이턴시 예산 준수, 원안 그대로).
- [x] 전부 저위험/전부 관여면 artifact-level 질문으로 폴백 — 질문은 여전히 세션당 1개 (triage 5단계
      마지막 분기가 기존 S3 문구("short artifact-level question about the overall change")로 그대로
      폴백; ship 공유 예산(1/세션)은 S3 로직 변경 없음).
- [x] risk taxonomy 6종이 엔진 문서에 고정 목록으로 존재 (`skills/ducking/engine.md`의 신설
      "Risk Taxonomy (Ship-Point Triage)" 섹션 — concurrency/security/performance/data schema/
      public API/architecture boundary, `code-review` 스킬 smell-baseline 형식(name → what → why)
      차용, "judgement call, never a hard classifier" 명시). 두 훅의 `additionalContext`는 ADR
      0003(엔진 비참조 경로) 준수를 위해 이 목록을 조건절 요약으로 별도 내장 — engine.md 말미에
      "keep both copies in sync" 주석으로 동기화 의무 명시.
- [x] 질문이 코드 품질을 지적하지 않음(스킬 경계 절 준수 — 이해 검증만) (훅 지시문에 "never code
      quality or style (that's /code-review's job, not duck's)" 명시; engine.md 신설 섹션에도 동일
      경계 재확인).

수동 테스트(가짜 stdin JSON): 정상 발사 시 `jq` 파싱 가능한 유효 JSON 출력 확인, 두 번째 ship
액션은 기존 rate-limit대로 침묵, subagent 컨텍스트(`agent_type` 존재)·`enabled:false` 컨텍스트
모두 기존대로 침묵, `CLAUDE_PLUGIN_ROOT` 미설정 가드(S10에서 잡은 버그)도 여전히 유효, S10 텔레메트리
`fire` 이벤트 로깅 회귀 없음, `bash -n` 문법 체크 통과, `grep -rlP '[\x{AC00}-\x{D7A3}]'` 결과 없음
(S14 회귀 없음).

**S8↔S11 파서 공유 질문 해소 (핸드오프 기록 참조):** `session-edits.sh`를 재사용하지 않기로 결정.
그 스크립트는 트랜스크립트에서 *AI가 편집한 파일*을 뽑는 것이고, S11의 engagement 축이 필요한 건
*유저가 논의/열람한 흔적*으로 서로 다른 신호다. 더 결정적으로, `duck-verify`(S8)는 편집을 못 본
새 컨텍스트에서 호출될 수 있어 트랜스크립트 재파싱이 꼭 필요하지만, ship-point confrontation은
push/PR을 만든 바로 그 대화 턴에서 발사되므로 모델이 이미 전체 대화를 컨텍스트로 갖고 있다 — 재파싱
없이 판단 가능(engine.md 신설 섹션에 이유 기록). 트랜스크립트 재파싱 폴백은 이번 슬라이스 범위 밖으로
남김(컴팩션으로 대화 맥락이 유실된 극단 상황 커버 안 함) — 오버엔지니어링 방지, 필요성이 실증되면
후속 슬라이스에서.

### Blocked by
S11은 S3(confrontation 주입점)·S4(엔진이 triage 수행)에 의존.

---

## S12 — Ignore streak → scoreboard 강등

**Phase:** 3 · **Blocked by:** S10, S11. · **출처:** 2026-07-04 위키 그릴 (습관화 대책).

### What to build
질문 무시가 누적되면 질문을 멈추고 사실 수치로 전환 — 잔소리 피로 없이 직면 유지. ship 훅 스크립트가
telemetry에서 **연속 무시 횟수(ignore streak)를 셸에서 결정론적으로 계산**(모델 판단 아님 —
deterministic-over-clever). streak ≥ 3이면 질문 모드 대신 scoreboard 모드 주입: "이번 세션 고위험
변경 N건(이름 나열) 중 당신이 관여한 건 M건." 유저가 다시 응답하면(telemetry에 answered 기록) 질문
모드 복귀. scoreboard도 비차단 — gate 아님, ADR 0003 준수.

### Acceptance criteria
- [ ] 연속 무시 3회 후 다음 ship은 질문 대신 scoreboard.
- [ ] streak 판정이 훅 스크립트(셸)에서 이뤄짐 — 트랜스크립트·모델 판단 불개입.
- [ ] answered 기록 후 질문 모드 복귀.
- [ ] scoreboard가 고위험 변경 이름을 나열(막연한 퍼센트 금지).

### Blocked by
S12는 S10(telemetry가 streak의 원천)·S11(고위험 분류가 scoreboard 내용)에 의존.

---

## S13 — Retrieval confrontation (과거 gap 재출제)

**Phase:** 3 · **Blocked by:** S11. · **출처:** 2026-07-04 위키 그릴 (learning-science spacing
effect — "기록만 하고 재노출 안 하는" gap 로그의 미활용 해소).

### What to build
S11 triage가 표적 없음(폴백 상황)일 때, gap 로그에 미해소 gap이 있으면 artifact-level 질문 대신
과거 gap 재출제: "지난번 [X] 모른다고 기록됨 — 지금은 설명 가능?" 유저가 해소하면 gap에 resolved
마킹(로그 포맷에 resolved 필드 추가, `recent-gaps.sh`는 미해소만 노출). 우선순위 사다리 확정:
**blind-spot 표적 > 미해소 gap retrieval > 범용 artifact 질문** — 어떤 경우에도 질문은 1개.

### Acceptance criteria
- [ ] blind-spot 표적 없음 + 미해소 gap 존재 시 retrieval 질문 발사.
- [ ] 유저가 해소하면 resolved 마킹, 이후 재출제 안 됨.
- [ ] gap 로그 비었으면 기존 artifact-level 질문 — 사다리 최하단.

### Blocked by
S13은 S11(폴백 사다리가 triage 결과에서 시작)에 의존.

---

## S14 — 덕 페르소나 대사 전면 영어화

**Phase:** 2 · **Blocked by:** 없음. · **출처:** 2026-07-05 S5 구현 중 유저 지적.

### What to build
S5 구현 중 유저가 `duck-prebuild`의 따옴표 안 한글 대사문(quoted dialogue)을 지적 — v2.4.1부터
있던 관행이나 ADR 0003·용어집(`docs/context/rubber-duck-tutor.md`)·핸드오프 어디에도 근거 없음
(`grep -i korean` 무결과), README에만 "Korean-native duck persona"로 문서화. AGENTS.md "plugin
deliverables는 영어(SKILL.md 포함)" 규칙과 충돌. 유저 결정: **영어로 전면 전환**.

대상: `skills/{duck,duck-prebuild,duck-verify,duck-review,duck-orient}/SKILL.md`,
`skills/ducking/engine.md`, `skills/ducking/references/exercise-patterns.md`, `README.md`(및
루트 `README.md`·`README.ko.md`의 이 플러그인 소개 문단은 대상 아님 — 이미 영어/한글 이원화된
마켓플레이스 소개 체계라 별개 정책). 페르소나 톤(curious, benevolent skeptic)·구조(질문 후 침묵,
Hint Ladder, Confidence Check)는 유지 — 대사 언어만 교체. 오프닝 의성어 "꽥" → "Quack".

### Acceptance criteria
- [x] `grep -rlP '[\x{AC00}-\x{D7A3}]' plugins/rubber-duck-tutor/` 결과 없음.
- [x] README가 더는 "한국어 전용 페르소나"를 주장하지 않음 — 해당 bullet 제거.
- [x] 페르소나 톤·플로우 구조 변경 없음 — 순수 언어 교체.

### Blocked by
없음 — 즉시 시작 가능.
