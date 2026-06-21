# rubber-duck-tutor 재설계: gate 거부 → ship-point confrontation (v3.0.0)

> 상태: 구현 대기 · 생성: 2026-06-21
> 지시서: `docs/handoff/2026-06-21-rubber-duck-tutor-redesign.md`
> ADR: `docs/adr/0003-duck-rejects-gates-confronts-at-ship-point.md`
> 용어집: `docs/context/rubber-duck-tutor.md`

v2.4.1 → 3.0.0 재설계의 수직 슬라이스 이슈. 각 슬라이스는 독립적으로 잡아서 단독 검증 가능. 결정은
락됨 — 위의 ADR·용어집·구현 지시서 참조. 아래 어휘는 도메인 용어집을 따름(ducking, confrontation,
ship-point confrontation, artifact-level vs code-level comprehension, shared ship budget).

## Dependency graph

```
independent leaves (block nothing):  S1   S2

S3 ──────────┐
             ├─► S7
S4 ──┬───────┘
     └─► S5 ─┬─► S6 ─► S8
             └─► S9
```

선행 블로커 없는 슬라이스(S1, S2, S3, S4)는 즉시 시작 가능. 버전 처리: S1–S9 재설계 전체가 한
릴리즈로 배포 — 중간 슬라이스는 `marketplace.json`을 범프하지 않음. `3.0.0`으로의 단일 범프는 S9에서
발생(breaking: `/duck-design`·`/duck-plan` 제거).

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

### Acceptance criteria
- [ ] 모델 호출 `ducking` 스킬이 존재하고 rubber-stamping 감지 시 자동 작동.
- [ ] 헬퍼 스크립트가 엔진의 새 `scripts/` 경로에서 실행됨.
- [ ] `grep -rn 'skills/duck/scripts'`가 라이브 참조 없음 반환 — 일곱 재지정 줄 모두 갱신됨.
- [ ] 어떤 스킬·참조도 옛 `core.md` 경로를 가리키지 않음(grep 깨끗).

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
ship 훅과 스킬 둘 다 준수 — `enabled: false`면 전부 침묵.

### Acceptance criteria
- [ ] `enabled: false`면 ship-point confrontation이 발사 안 되고 스킬은 no-op.
- [ ] 기본 강도를 `ducking` 엔진이 읽음.
- [ ] config 파일이 없거나 잘못되면 크래시 대신 enabled / standard 기본값.

### Blocked by
S7는 S3(훅이 `enabled`를 읽어야)·S4(엔진이 강도를 읽음)에 의존.

---

## S8 — duck-verify의 turn-scoping

**Phase:** 3 · **Blocked by:** S6.

### What to build
`duck-verify`는 `git diff`가 보여주는 것 너머 *이번 세션*에 만든 편집을 잡아야 함 — 마지막 유저
프롬프트 이후의 `Edit`/`Write`/`MultiEdit`/`NotebookEdit`를 트랜스크립트에서 파싱(no-numb gate에서
차용한 기법). 방어적으로 파싱: 트랜스크립트 포맷 변경 시 크래시 없이 우아하게 저하.

### Acceptance criteria
- [ ] 이번 세션 앞서 만든 미커밋 편집을 `duck-verify`가 드러냄.
- [ ] `git diff`가 깨끗할 때(세션 편집 이미 커밋)도 동작.
- [ ] 파싱 불가 트랜스크립트는 에러 대신 `git diff` 경로로 저하.

### Blocked by
S8은 S6에 의존(`duck-verify` 래퍼 확정됨).

---

## S9 — 정체성 재작성 + 3.0.0 범프

**Phase:** 3 · **Blocked by:** S5.

### What to build
README, `plugin.json`, `marketplace.json`에서 플러그인 정체성 재작성: AI 코딩 라이프사이클 전체에
걸친 이해-유지 레이어 — 동료 스킬(grill-with-docs, `/branch`)이 있으면 병합되고 없으면 단독 동작,
after-build 전용으로 좁히지 않음. S9는 `plugin.json`·`marketplace.json`의 **description** 문자열의
**유일 작성자**(S5가 의도적으로 안 건드림), 그래서 제거된 `/duck-design`·`/duck-plan` 이름이 그 두
매니페스트에서 최종적으로 빠지는 곳이 이 재작성. 버전을 `3.0.0`으로 범프(breaking:
`/duck-design`·`/duck-plan` 제거). 로컬 소스 플러그인이라 버전은 `marketplace.json`에만 존재.

### Acceptance criteria
- [ ] README와 두 매니페스트가 라이프사이클 전반 정체성을 기술; after-build 전용 프레이밍 없음.
- [ ] description은 현재 명령만 나열(제거된 `/duck-design`, `/duck-plan` 없음).
- [ ] `marketplace.json` 버전이 `3.0.0`.

### Blocked by
S9는 S5에 의존(명령이 거기서 리네임됨).
