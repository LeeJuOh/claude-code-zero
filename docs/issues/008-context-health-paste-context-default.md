# context-health-visual: `--paste-context`를 opt-out 기본 질문으로 승격

> 상태: 구현 대기 · 생성: 2026-07-05
> 출처: grill-with-docs 세션 파생 (007 그릴 중 발견 — artifact 채널과 무관한 별건)

## What to build

진단 정확도의 핵심 장치(`/context` 실측으로 시작 부하 추정치 교정)가 opt-in 플래그 뒤에 숨어 있다.
스킬의 존재 이유가 "정확한 컨텍스트 예산 진단"인데 기본 경로가 추정치 — 뒤집는다.

스킬 시작 시 **항상** `AskUserQuestion`으로 제안: "`/context` 출력 붙여넣기 (권장) / 추정치로 진행".
붙여넣으면 실측 교정(현행 로직 그대로), 건너뛰면 현행 추정+caveat. 플래그는 제거.

## Acceptance criteria

- [ ] Phase 1 데이터 수집 시작 시 opt-out 질문 항상 표시 (붙여넣기 권장 / 스킵).
- [ ] 붙여넣기: 실측값으로 추정치 교정 + estimate-caveat 제거 (현행 `--paste-context` 로직 이동).
- [ ] 스킵·무응답·헤드리스: 추정치 + caveat (현행 기본 경로).
- [ ] `--paste-context` 플래그 제거 — `argument-hint`, SKILL.md 파라미터 표, README 갱신.
- [ ] `--use-instructions-loaded-hook`은 현행 opt-in 유지 (설정 파일 수정 + 재시작 요구라 비용이 큼 — 기본 승격 대상 아님).
- [ ] `marketplace.json` 버전 patch 범프 (다음 릴리즈에 007과 합산 시 그쪽 따름).

## Blocked by

- None — 즉시 시작 가능. (007과 독립.)
