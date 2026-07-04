# CONTEXT — rubber-duck-tutor

> rubber-duck-tutor의 유비쿼터스 언어. 용어집 전용 — 구현 없음.
> 결정은 `docs/adr/`에 있음. 어휘는 그릴 세션(2026-06-21, 2026-07-04)에서 다듬음.

## Language

**ducking**:
모델 호출 이해-규율 엔진 — 모든 유저 대면 모드가 호출하는 재사용 루프. 에이전트가 rubber-stamping을
감지하면 자동 작동.
_Avoid_: core, core.md, shared rules

**Rubber-stamping**:
AI 생성 산출물(코드·계획·설계)을 이해 없이 수용하는 것. 플러그인이 막으려는 실패 모드.
_Avoid_: blind approval, glossing over

**Confrontation**:
비차단·기본 켜짐 이해 질문. 작업을 드러내되 멈추지 않음 — 유저는 답하거나 넘어갈 수 있음.
_Avoid_: nudge, prompt, reminder

**Gate**:
조건 충족까지 작업을 막는 차단형 강제 장치(예: 퀴즈 통과). 명시적으로 거부됨 — ADR 0003 참조.
_Avoid_: block, wall, checkpoint

**Forcing function**:
gate 뒤의 메커니즘 — 행동을 강제하려 의도적으로 넣은 마찰. no-numb의 모델이자 duck의 안티패턴.

**Ship-point confrontation**:
배포 순간(`git push` / PR / MR 생성)에 방금 배포한 변경에 대해 발사되는 confrontation. duck의 주
기본-켜짐 검증 레이어.
_Avoid_: post-push nag

**Artifact-level comprehension**:
산출물이 *무엇을* 하고 *왜* 하는지를 출력 단위로 이해. 기본 검증 대상.
_Avoid_: output review, high-level review

**Code-level comprehension**:
코드가 *어떻게* 동작하는지 한 줄씩 이해. 자발적 심층 레이어(`duck-verify`)이며 강제 기본값이 아님 —
전수 검증은 비현실적.
_Avoid_: line-by-line review

**Before-build comprehension**:
AI가 생성하기 *전에* 발휘하는 이해 — 자기 설계·계획을 먼저 예측한 뒤 AI 출력과 대조. `duck-prebuild`가
담당.
_Avoid_: pre-coding review

**After-build comprehension**:
코드·산출물이 존재한 *뒤에* 발휘하는 이해 — 생성된 것을 파악했는지 검증. `duck-verify`와 `duck-review`가
담당.

**Generation effect**:
레퍼런스를 보기 전 자기 답을 먼저 만들 때 생기는 학습 부스트. before-build comprehension이 자리값을
하는 이유.

**Shared ship budget**:
`{git push, gh pr create, glab mr create}`는 세션당 최대 한 번 ship-point confrontation을 발사 —
먼저 발사한 게 이김. `git push`가 범용 폴백(웹 PR·Bitbucket·GitLab MR 모두 먼저 push)이라 CLI 훅이
놓치는 플랫폼을 커버.

**Complement (not substitute)**:
duck과 no-numb은 보완재 — 하드 gate를 원하는 유저는 둘 다 설치. duck은 no-numb의 forcing function을
흡수하지 않음. 같은 원리로 duck은 `/code-review`(코드 품질)·`/grilling`(계획 검증)도 침범하지 않음 —
duck의 축은 항상 유저의 이해.

**Engagement**:
유저가 세션 중 특정 변경을 열람·논의했다는 트랜스크립트 기반 객관 신호. blind-spot 판정의 한 축.
_Avoid_: attention, review status

**Risk taxonomy**:
변경 중요도 판정용 고정 분류 — 동시성, 보안, 성능, 데이터 스키마, 공개 API, 아키텍처 경계. 항상
judgement call이지 하드 룰이 아님. blind-spot 판정의 다른 축.
_Avoid_: severity levels

**Blind spot**:
고위험(risk taxonomy 상위)인데 engagement가 없는 변경 — confrontation의 1순위 표적. 파일 열람률
지표가 아님: 저위험이면 안 봤어도 표적 아님.
_Avoid_: unseen file, coverage gap

**Interface-fact question**:
변경의 invariant·에러 모드·순서 제약·트레이드오프를 묻는 질문 형태 — blind-spot 표적에 사용.
검수자/아키텍트 수준 이해를 검증(코더 수준 암기가 아님).
_Avoid_: did-you-read-it question

**Confrontation telemetry**:
confrontation의 발사·응답·무시 기록. "동작하는지 모름"을 없애는 관측 레이어. 발사 기록은 결정론(훅),
outcome 기록만 모델 판단.
_Avoid_: analytics, usage stats

**Ignore streak**:
연속 무시 횟수 — telemetry에서 셸이 결정론적으로 계산. scoreboard 강등 조건.

**Scoreboard**:
ignore streak 초과 시 질문 대신 표시하는 사실 수치("고위험 변경 N건 중 관여 M건", 이름 나열).
confrontation의 저강도 형태 — 여전히 비차단, 응답 재개 시 질문 모드 복귀.
_Avoid_: nag, warning banner

**Retrieval confrontation**:
과거 미해소 gap을 재출제하는 confrontation — spacing effect 활용. 폴백 사다리의 중간 단(blind-spot
표적 > gap retrieval > 범용 artifact 질문).
_Avoid_: quiz replay

## Recorded in

- ADR: `docs/adr/0003-duck-rejects-gates-confronts-at-ship-point.md`
- Handoff / implementation directive: `docs/handoff/2026-06-21-rubber-duck-tutor-redesign.md`
