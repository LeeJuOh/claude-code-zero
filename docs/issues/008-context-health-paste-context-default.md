# context-health-visual: `--paste-context`를 opt-out 기본 질문으로 승격

> 상태: **완료** (5676ca4, vision-powers 4.6.2) · 생성: 2026-07-05 · 결정: 2026-07-10 A안 확정 · 완료: 2026-07-10
> 출처: grill-with-docs 세션 파생 (007 그릴 중 발견 — artifact 채널과 무관한 별건)

## What to build

진단 정확도의 핵심 장치(`/context` 실측으로 시작 부하 추정치 교정)가 opt-in 플래그 뒤에 숨어 있다.
스킬의 존재 이유가 "정확한 컨텍스트 예산 진단"인데 기본 경로가 추정치 — 뒤집는다.

스킬 시작 시 **항상** `AskUserQuestion`으로 제안: "`/context` 출력 붙여넣기 (권장) / 추정치로 진행".
붙여넣으면 실측 교정(현행 로직 그대로), 건너뛰면 현행 추정+caveat. 플래그는 제거.

## Decision (2026-07-10)

**A안 확정 — 매번 물음.** 스킬 실행 때마다 opt-out 질문을 띄운다. config에 선호를 저장하는 B안,
"세션 내 이미 물었으면 스킵" 변형은 기각 — 모델이 "이 세션에서 이미 질문함" 상태를 안정적으로
기억하지 못해 게이트가 원위치될 위험만 늘고 결정성이 깨진다. 순수 A = 최소·결정적. paste 처리
로직 자체는 신규 아님(현행 `SKILL.md:88`) — 플래그 게이트만 떼어 Phase 1 시작으로 이동한다.
config.js에 paste 키를 추가하지 않는다(A는 저장 안 함).

## Acceptance criteria

- [x] Phase 1 데이터 수집 시작 시 opt-out 질문 항상 표시 (붙여넣기 권장 / 스킵).
- [x] 붙여넣기: 실측값으로 추정치 교정 + estimate-caveat 제거 (현행 `--paste-context` 로직 이동).
- [x] 스킵·무응답·헤드리스: 추정치 + caveat (현행 기본 경로).
- [x] `--paste-context` 플래그 제거 — arg-hint·파라미터 표 행·gotcha 문구·README 예시 줄 모두 제거
      (`grep paste-context SKILL.md` = 0건 확인).
- [x] `--use-instructions-loaded-hook`은 현행 opt-in 유지 (설정 파일 수정 + 재시작 요구라 비용이 큼 — 기본 승격 대상 아님).
- [x] `marketplace.json` 버전 patch 범프: 4.6.1 → 4.6.2 (007은 4.6.1로 이미 릴리즈됨 — 단독 범프).

## Blocked by

- None — 즉시 시작 가능. (007과 독립.)
