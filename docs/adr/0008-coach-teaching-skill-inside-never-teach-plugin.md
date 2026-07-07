---
status: accepted
---

# 0008 — rubber-duck-tutor: never-teach 플러그인 안에 티칭 스킬(/coach) 추가

## Context

duck의 정체성은 "Never solve, never hint, never teach. Ask, then wait." (engine.md, S9 identity
rewrite, ADR 0003). 그런데 외부 아티클의 빌드-우선 코딩 튜터 프롬프트를 스킬화하려는 요구가 생김 —
정확히 duck이 금지한 행위(가르치기)를 하는 스킬.

분석 결과 아티클의 범용 튜터 루프(프롬프트 1)는 사용자가 이미 쓰는 외부 `teach` 스킬(mattpock)이
상위호환 — 미션 관리, ZPD 계산, 학습기록, 리소스 큐레이션까지. 새로 만들면 열화판. 다만 teach가
갖지 못한 델타가 셋 남음:

1. **생성 코드 즉석 해부** (아티클 프롬프트 2) — 섹션별로 무엇을/왜 이 방식을/프로덕션에서 깨질 곳.
2. **시도-첨삭 루프** — 사용자의 연습 시도를 시니어 관점에서 비평. teach의 피드백 루프는 브라우저
   퀴즈 중심이라 이 부분이 약함.
3. **무상태 즉석성** — teach는 현재 디렉토리를 학습 워크스페이스로 취급(MISSION.md 등 생성). 코드
   리포 한복판에서 "5분만 배우기"에는 부적합.

한편 duck은 갭을 발견해 `gaps.log`에 기록만 하고 **메꿔주지는 않음** — 의도된 설계지만, 학습
루프(발견 → 기록 → 해소)의 뒷반쪽이 비어 있었음.

## Decision

`/coach`를 rubber-duck-tutor에 **duck이 아닌 형제 스킬**로 추가. 정체성 모순은 페르소나 분리로
해소: duck은 계속 절대 가르치지 않고, coach는 가르치고 첨삭하되 이해 검증(심문)은 하지 않음.
"duck never teaches"는 "teaching is /coach's job"으로 오히려 선명해짐.

- **세 모드**: 주제(`/coach <topic>` — 개념+비유 → 최소 실행 예제 → 연습 → 첨삭, 단계별 대기),
  코드 해부(최근 생성 코드 존재 시), 갭(`gaps.log`의 미해소 갭 제안).
- **gaps.log 공유**: coach가 갭을 가르치고, 사용자가 **연습을 풀어 첨삭을 통과하면**(말뿐인 이해가
  아니라 적용 입증) `resolve-gap.sh`로 해소, 첨삭 중 새 갭이 드러나면 `log-gap.sh`로 기록. duck의
  간격-반복 재소환과 같은 장부를 씀.
- **수동 전용** (`disable-model-invocation: true`) — "배우고 싶다"류 발화에서 외부 teach 스킬과
  트리거 경쟁하는 사고 방지.
- **경계 규칙**: 여러 세션짜리 코스감 주제는 받지 않고 범위 좁히기 또는 장기 학습 도구(teach 계열)로
  위임. 심문은 duck, 코드 품질은 /code-review 영역 — coach는 학습만.
- **페르소나**: 시니어 사수. 오프닝 시그니처 `🧢 Coach —`. 답은 첨삭 단계에서만.

## Considered options

- **(A) 아티클 프롬프트 1의 단독 스킬화** — 거부: teach가 상위호환, 열화판 중복.
- **(B) 신규 초소형 플러그인** — 거부: 스킬 1개짜리 플러그인 추가 비용 대비, `gaps.log` 연동(학습
  루프 완성)을 포기하게 됨.
- **(C) toolbox에 배치** — 거부: dev 유틸 모음(fetch-sitemap, handoff 등)에 학습 스킬은 미아.
- **(D, 선택) rubber-duck-tutor 형제 스킬** — 플러그인 미션("AI 코딩 중 날카롭게 유지")에 부합,
  gaps.log 연동이 공짜, duck(발견) → coach(해소)로 학습 루프 완성.
- **(참고) teach 상위호환 재구현 + vision-powers 렌더링** — 거부: 델타 2개를 위해 140줄 설계물
  전체를 재구현하는 격. vision-powers는 정적 분석 리포트 도구라 인터랙티브 교육 위젯(레슨의 80%)을
  대체하지 못함 — 재사용 가능한 건 report-manager 인프라 20%뿐.

## Consequences

- README Scope 문구 갱신 필요: "duck only checks whether you understand"에 coach 위임 문장 추가.
- `gaps.log`가 duck ↔ coach의 **공유 계약**이 됨 — 포맷·스크립트(log-gap/resolve-gap/recent-gaps)
  변경 시 양쪽 스킬 모두 확인.
- **coach의 갭 해소 바는 연습-통과에 게이팅** (그릴 2026-07-08): coach가 방금 가르친 것을 자기가
  채점하면 engine.md의 Skeptical Grading이 막으려는 자기-관대 채점(이해충돌)이 된다. 게다가
  `resolved:true`는 `recent-gaps.sh`가 영구 필터링하므로, 소프트한 해소는 그 갭을 duck의 회의적
  간격-반복 로테이션에서 영영 빼버린다. 그래서 말뿐인 "이해했어요"가 아니라 연습 적용 입증에만 해소를
  허용해 소프트-바 영구 은퇴를 차단한다. (구현 반영: 이슈 009 S3)
- coach 비대화 금지: 커리큘럼, 진도 관리, 워크스페이스 상태(MISSION.md류), HTML 산출물은 영구히
  비대상 — 그건 teach의 영역. coach가 남기는 유일한 흔적은 gaps.log 갱신.
- `/duck-*` 네임스페이스 사용 금지 — duck 페르소나 규칙(engine.md)이 `/duck*` 전체에 걸려 있으므로
  coach는 별도 이름을 유지.
- coach는 engine.md를 읽지 않음 — "Wait for their answer" 규율만 자체 SKILL.md에 복제. duck 전용
  규칙(Skeptical Grading, Confidence Check 등)이 coach에 새는 것을 방지.
- 버전 minor 범프 (3.0.0 → 3.1.0), marketplace.json description 갱신.
