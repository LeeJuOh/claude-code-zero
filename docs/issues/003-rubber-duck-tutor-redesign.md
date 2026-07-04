# rubber-duck-tutor 재설계: gate 거부 → ship-point confrontation (v3.0.0)

> 상태: 구현 대기 · 생성: 2026-06-21 · 확장: 2026-07-04 (위키 그릴 세션 — S10~S13 추가, S4 보강)
> 지시서: `docs/handoff/2026-06-21-rubber-duck-tutor-redesign.md`
> ADR: `docs/adr/0003-duck-rejects-gates-confronts-at-ship-point.md`
> 용어집: `docs/context/rubber-duck-tutor.md`

v2.4.1 → 3.0.0 재설계의 수직 슬라이스 이슈. 각 슬라이스는 독립적으로 잡아서 단독 검증 가능. 결정은
락됨 — 위의 ADR·용어집·구현 지시서 참조. 아래 어휘는 도메인 용어집을 따름(ducking, confrontation,
ship-point confrontation, artifact-level vs code-level comprehension, shared ship budget).

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

## S1 — 거짓 /branch · /resume 폴백 제거

**Phase:** 1 · **Blocked by:** 없음 — 즉시 시작 가능.

### What to build
`/branch`와 `/resume`는 Claude Code 빌트인(`/branch [name]`, `/resume [session]`,
alias `/continue`). 플러그인은 현재 이들을 외부 플러그인(`lab-harness-zero`)이 필요한 것처럼
문서화하고, 그 거짓 전제 위에 폴백 분기를 얹음. 폴백 분기와 외부 플러그인 선행조건을 제거하고
"빌트인, 항상 사용 가능"으로 단순화.

### Acceptance criteria
- [ ] 어떤 플러그인 문서도 `/branch`·`/resume`가 외부 플러그인을 요구한다고 주장하지 않음.
- [ ] "/branch·/resume 사용 불가 시" 폴백 분기 제거됨.
- [ ] README Prerequisites가 외부 플러그인 의존성을 더는 나열하지 않음.

### Blocked by
없음 — 즉시 시작 가능.

---

## S2 — 경로 기반 문서 트리거

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
- [ ] 번호형 ADR(`docs/adr/0003-....md`) 작성 시 트리거 발사.
- [ ] 파일명 스타일(`adr-foo.md`)도 폴백으로 여전히 매칭.
- [ ] 잘못된 override regex는 기본 경로 집합으로 폴백; 트리거가 조용히 죽지 않음.

### Blocked by
없음 — 즉시 시작 가능.

---

## S3 — Ship 훅: shared ship budget + suggest→confront

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
- [ ] 세션 첫 ship 액션은 confrontation 하나 발사; 같은 세션 두 번째 ship 액션은 침묵.
- [ ] `git push` 단독(`gh`/`glab` 없이)도 confrontation 발사.
- [ ] 주입된 컨텍스트는 명령 실행 제안이 아니라 질문으로 confront.

### Blocked by
없음 — 즉시 시작 가능.

---

## S4 — core.md를 `ducking` 엔진으로 승격

**Phase:** 2 · **Blocked by:** 없음 — 즉시 시작 가능(단 S5·S6가 이 위에 빌드).

### What to build
`core.md`의 공유 규칙을 모델 호출 `ducking` 스킬로 승격 — 에이전트가 rubber-stamping을 감지하면 자동
작동하는 재사용 이해-규율 엔진. 헬퍼 스크립트(`log-gap.sh`, `recent-gaps.sh`)를 엔진 자체 `scripts/`
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

**2026-07-04 보강 — 발동률 검증(trigger eval):** 모델 호출 `ducking`의 자동 작동은 description
문구가 전부 결정하고, 안 터져도 조용해서 감지 불가("undertriggering" — Anthropic skills 레슨).
skill-creator-pro의 trigger eval로 rubber-stamping 시나리오에서 실제 발동률을 측정하고 통과해야
S4 완료.

### Acceptance criteria
- [ ] 모델 호출 `ducking` 스킬이 존재하고 rubber-stamping 감지 시 자동 작동.
- [ ] 헬퍼 스크립트가 엔진의 새 `scripts/` 경로에서 실행됨.
- [ ] `grep -rn 'skills/duck/scripts'`가 라이브 참조 없음 반환 — 일곱 재지정 줄 모두 갱신됨. 단 역사
      문서(`docs/handoff`, `docs/issues` — 이 이슈 자신이 문자열 포함)는 제외.
- [ ] 어떤 스킬·참조도 옛 `core.md` 경로를 가리키지 않음(grep 깨끗).
- [ ] 엔진에 관대 채점 금지 규칙 존재 — 모호한 답변을 정답 처리하지 않음.
- [ ] trigger eval로 rubber-stamping 시나리오 발동률 측정·통과(미발동이 조용히 남지 않음).

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
- 엔진 본문 — `core.md`(S4에서 `ducking`이 됨) line 3의 모드 목록이 `/duck-design`·`/duck-plan` 열거

범위 경계: `plugin.json` / `marketplace.json`의 **description** 산문은 S9(정체성 재작성)에서 다시
씀, 그래서 S5는 그 두 문자열을 **건드리지 않음** — S5/S9 write-write 충돌 회피. S5는 두 매니페스트
description을 제외한 모든 곳의 리네임을 소유.

### Acceptance criteria
- [ ] `/duck-prebuild`가 두 before-build 흐름을 모두 실행.
- [ ] `/duck-design`·`/duck-plan` 스킬이 더는 존재하지 않음.
- [ ] `grep -rn 'duck-design\|duck-plan'`가 라이브 참조 없음 반환 — **단** 두 매니페스트
      description(S9 소유)과 역사 문서(`docs/handoff`, `docs/issues`, `docs/adr`) 제외.

### Blocked by
S5는 S4에 의존(래퍼가 `ducking` 엔진을 호출).

---

## S6 — 호출 일관성 + 얇은 래퍼

**Phase:** 2 · **Blocked by:** S4, S5.

### What to build
정확히 한 스킬만 모델 호출(`ducking`); 모든 유저 대면 모드(`duck-prebuild`, `duck-verify`,
`duck-review`, `duck-orient`)와 `duck` 라우터는 유저 호출·**얇게** 됨 — 단계별 프레이밍만 설정하고
엔진을 호출, 중복 루프 로직 없음. 현재 모델 호출 누수는 하나가 아니라 **둘**: `duck-design`(핸드오프에
표시됨) **그리고** `duck` 라우터 자체 — 둘 다 `disable-model-invocation: true`가 없음(오늘은
`duck-plan`/`verify`/`review`/`orient`만 설정). 둘 다 유저 호출로 끝나야 하고, `ducking`이 유일한
모델 호출 스킬.

### Acceptance criteria
- [ ] 정확히 한 스킬만 모델 호출 가능(`ducking`); 나머지 전부 `disable-model-invocation: true` 설정.
- [ ] 어떤 유저 대면 래퍼도 엔진 루프를 중복하지 않음 — 각자 `ducking` 호출.
- [ ] 이전 `duck-design` 자동 팝 동작이 래퍼에서 더는 발생하지 않음.

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
- [ ] `enabled: false`면 ship-point confrontation이 발사 안 되고 스킬은 no-op.
- [ ] 기본 강도를 `ducking` 엔진이 읽음.
- [ ] config 파일이 없거나 잘못되면 크래시 대신 enabled / standard 기본값.

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
- [ ] 이번 세션 앞서 만든 미커밋 편집을 `duck-verify`가 드러냄.
- [ ] `git diff`가 깨끗할 때(세션 편집 이미 커밋)도 동작.
- [ ] 파싱 불가 트랜스크립트는 에러 대신 `git diff` 경로로 저하.

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
- [ ] ship confrontation 발사 시 훅이 로그 1줄 append — 모델 개입 없이.
- [ ] 응답/무시가 outcome으로 기록됨.
- [ ] 로그 부재·파손 시 훅·스킬 정상 동작(크래시·침묵사 없음).
- [ ] 발사/응답/무시 요약 조회 가능.

### Blocked by
S10은 S3(ship 훅이 기록 주체)·S4(엔진이 outcome 기록)에 의존.

---

## S11 — Blind-spot 정조준 (risk × engagement)

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
- [ ] 고위험+미관여 변경 존재 시 질문이 그 변경을 지명하고 interface-facts를 묻는다.
- [ ] 전부 저위험/전부 관여면 artifact-level 질문으로 폴백 — 질문은 여전히 세션당 1개.
- [ ] risk taxonomy 6종이 엔진 문서에 고정 목록으로 존재.
- [ ] 질문이 코드 품질을 지적하지 않음(스킬 경계 절 준수 — 이해 검증만).

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
