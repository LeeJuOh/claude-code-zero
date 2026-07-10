# vision-powers: artifact-first 기본화 — 다이어그램 선택은 채널무관, Mermaid는 강등된 렌더링 (ADR 0009)

> 상태: **전체 S0~S6 구현 대기** (A안 빅뱅 확정) · 생성: 2026-07-08 · 결정: 2026-07-10
> 용어집: `docs/context/vision-powers.md` (갱신 용어: **Channel**, **Diagram-type selection vs Rendering technique**, **Relational diagram vs Analytical chart**, **Readability vs Visibility**; **Artifact channel** opt-in→기본으로 재정의)
> 결정 근거: `docs/adr/0009-artifact-first-default-diagram-selection-channel-agnostic.md` (`0007` amend)
> 출처: grill-with-docs + domain-modeling 세션 (2026-07-08) — 로컬 vs 아티팩트 도그푸딩 체크포인트

## 배경

같은 소스를 두 채널로 렌더해 비교한 결과, built-in artifact-design가 로컬 design-system 룩을
디자인·가독성·가시성에서 이겼다(내용은 동률). ADR 0007이 "위임 디자인이 실망하면 Plan B"로 걸어둔
가정이 뒤집힌 것. 핵심 교훈: **Mermaid는 다이어그램 레이어가 아니라 하나의 렌더링 기법**이고, 진짜
자산은 "어떤 경우 어떤 다이어그램"이라는 **선택 지능**이다. ADR 0009는 이를 근거로 (a) capable
계정의 html에서 Artifact를 **기본 채널**로 승격, (b) Mermaid를 non-capable html·md **폴백**으로 강등
한다. 대상 스킬: `doc-visual`·`diff-visual`·`context-health-visual`·`plugin-visual`(+ 채널이 없는
`fact-check` 신설).

각 슬라이스는 **행동 + 문서 + 검증**을 관통하는 tracer-bullet 세로 절단이며, 독립적으로 데모·검증
가능하다. S2~S4는 S1 이후 병렬 가능.

## Decision (2026-07-10) — 전체 빅뱅 (A안)

grill-with-docs 세션 결정. **당일 초안(단계적 S0+S1)을 재검토해 전체 빅뱅으로 확정.** ADR 0009대로
S0~S6 전부 이번 라운드에 구현한다.

- **왜 단계적을 버렸나:** 단계적의 근거는 "스킬별 아티팩트 렌더 품질이 미검증(증거=doc-visual 1건)"
  이었다. 그런데 `--local`(force-local) 오버라이드가 있어 **어느 스킬에서 아티팩트 기본이 별로여도
  한 플래그로 로컬 복귀 + 언제든 비교 가능** — "나쁜 렌더"가 함정이 아니라 1회 타이핑으로 해결되는
  가역 상태다. 렌더 리스크가 값싸게 회수되므로 단계적으로 미룰 이유가 약하다. 도그푸딩도 아티팩트
  렌더 우위를 보였다.
- **범위 = S0~S6 전부.** S2~S4(diff·context-health·plugin flip)는 S1 패턴의 기계적 복제.
  **S5(fact-check 채널 신설)도 포함** — 단 이건 flip이 아니라 처음부터 채널을 만드는 것이라
  `--local` 가역 논리가 적용되지 않고(만들 게 없으면 비교 baseline도 없음) 코드·테스트 lift가 가장
  크다는 점을 인지하고 진행.
- **전역 config 뒤집기 채택(S0 원안).** `config.js`가 `artifact` 키 부재를 **artifact-first로 해석**
  하도록 기본해석을 뒤집고(헤더 주석에 문서화), 4개 flip 스킬의 Config-precedence 산문을 여기에
  맞춘다. (단계적 초안의 "doc-visual 산문만" 축소는 폐기 — 전체를 뒤집으니 전역이 더 단순.)
- **완화책(조용한-게시 리스크) 전 스킬 공통:** (1) capable 계정 + html에서만 뒤집힘, (2) non-capable
  (API키/CI/`disableArtifact`)은 자동 로컬 degrade, (3) publish 시점에 "claude.ai에 게시함 — 로컬은
  `--local`" 1줄 고지, (4) `force-local`로 되돌림. 특히 **context-health는 환경 스캔이라** 게시 고지를
  빠뜨리지 말 것(리포트는 counts-only privacy guard 유지).
- **force-local 플래그 이름 = `--local` 확정** (`--no-artifact` 기각 — 더 김). 자연어 동치 포함.
- **구현 중 스킬별 렌더 1회 육안 확인**(특히 context-health 10-카드 밀도 — 해당 SKILL.md가 경고).
  게이트가 아니라 빌드 단계의 눈검사; 깨지면 그 자리서 고치고 진행.

---

## S0 — 프리팩터: 채널결정 계약 + force-local 오버라이드 + config 기본값

### What to build

스킬들이 각자 재유도하지 않도록 채널 선택 규칙을 **한 곳에 못박는다**. 결정표는
`(아티팩트 가능? × Format) → Channel + 폴백`:

| Format | capable | 결과 |
|---|---|---|
| html | yes | Artifact (기본 publish) |
| html | no | Local (design-system + Mermaid) |
| md | any | Local (design-system + Mermaid fence) |

capable 계정에서 로컬을 강제하는 **force-local 오버라이드 플래그**를 도입하고(분석형 차트·줌/팬 필요
시), `config.js` 기본값을 `artifact: true`(capable 전제)로 뒤집는다. 이번 요청의 명시적 신호(플래그·
자연어)는 항상 config보다 우선. 결정표·플래그 의미론은 공유 레퍼런스 문구로 두어 S1~S5가 인용한다.

### Acceptance criteria

- [ ] force-local 플래그 이름 = **`--local` 확정** (자연어 동치 포함; `--no-artifact` 기각)
- [ ] `config.js` 기본값 `artifact: true` 해석 — **이번 라운드는 doc-visual 국한**(위 Decision 참조).
      전역 config 스키마·기본해석은 이번에 안 건드림; 다른 스킬은 S2~S5에서 개별 적용
- [ ] 명시적 요청 > config > 기본값 우선순위가 한 곳에 서술됨
- [ ] non-capable(API키/CI/`disableArtifact`) 세션은 자동으로 Local로 degrade하는 규칙이 계약에 포함
- [ ] 결정표가 `docs/adr/0009`와 일치 (회귀 시 ADR이 SSOT)

### Blocked by

None — can start immediately.

---

## S1 — doc-visual: artifact-first end-to-end (레퍼런스 구현)

### What to build

S0 계약을 doc-visual에 실제로 태운다. capable 계정 + html → **기본 Artifact publish**(플래그 없이),
force-local → 로컬 design-system + Mermaid, non-capable → 자동 degrade, md → 불변(Local). arg-hint·
publish 고지 문구·README 해당 행·SKILL 산문을 새 기본값에 맞게 갱신하고, 기존 gate·검증이 통과함을
확인한다. 나머지 3개 채널 스킬이 복제할 **검증된 패턴**이 된다.

### Acceptance criteria

- [ ] capable html에서 플래그 없이 실행 → Artifact로 publish
- [ ] force-local 플래그 → 로컬 파일 + Mermaid (분석형 차트·줌/팬 복귀)
- [ ] non-capable 세션 → 로컬로 degrade + 1줄 사유 고지
- [ ] md 출력 경로는 동작 불변
- [ ] arg-hint·publish 고지·README 행이 "기본 아티팩트"를 정확히 반영
- [ ] 콘텐츠 gate 통과, 회귀 없음

### Blocked by

- S0

---

## S2 — diff-visual: artifact-first 패턴 적용

### What to build

S1에서 검증된 패턴을 diff-visual에 복제. 동작·문서·검증 항목 동일, 입력 슬라이스(diff)만 다름.

### Acceptance criteria

- [ ] capable html 기본 Artifact / force-local / non-capable degrade / md 불변 모두 동작
- [ ] arg-hint·고지·README 갱신
- [ ] gate 통과, 회귀 없음

### Blocked by

- S1

---

## S3 — context-health-visual: artifact-first 패턴 적용

### What to build

S1 패턴을 context-health-visual에 복제. `--paste-context` 등 기존 플래그와 force-local이 충돌 없이
공존하는지 확인.

### Acceptance criteria

- [ ] capable html 기본 Artifact / force-local / non-capable degrade / md 불변 모두 동작
- [ ] 기존 플래그와 force-local 상호작용 검증
- [ ] arg-hint·고지·README 갱신, gate 통과, 회귀 없음

### Blocked by

- S1

---

## S4 — plugin-visual: artifact-first 패턴 적용

### What to build

S1 패턴을 plugin-visual에 복제. path-or-url 입력에서도 채널 결정이 동일하게 적용되는지 확인.

### Acceptance criteria

- [ ] capable html 기본 Artifact / force-local / non-capable degrade / md 불변 모두 동작
- [ ] arg-hint·고지·README 갱신, gate 통과, 회귀 없음

### Blocked by

- S1

---

## S5 — fact-check: 아티팩트 채널 신설 + 기본화 (정책 통일)

### What to build

fact-check는 현재 채널이 없다(`--artifact` 없음). 나머지 4개 스킬과 동일한 built-in artifact-design
렌더링 경로를 **신설**하고, 같은 artifact-first 기본값을 적용한다. 다른 슬라이스가 "기본값 뒤집기"인
반면 이건 "채널 만들기"라 lift가 가장 크다.

### Acceptance criteria

- [ ] fact-check가 html에서 Artifact 채널로 publish 가능
- [ ] S0 결정 계약(capable × format → channel)을 그대로 따름
- [ ] force-local / non-capable degrade / md 경로 동작
- [ ] arg-hint에 채널 플래그 반영, README에 fact-check 행 추가, gate 통과

### Blocked by

- S0

---

## S6 — 레퍼런스 리프레이밍 + 출시

### What to build

"다이어그램 선택 = 채널무관, Mermaid = 강등된 렌더링 기법" 프레이밍을 설계 레퍼런스
(`diagram-type-selection.md`·`mermaid-patterns.md`의 스코프 주석)와 README 2×2 채널 표에 반영. 전
스킬 착지 후 CHANGELOG 항목 추가 + marketplace 버전 minor 범프 + `plugin.json`/`marketplace.json`
description 갱신, `unset CLAUDECODE && claude plugin validate .`로 최종 검증.

### Acceptance criteria

- [ ] diagram-type-selection·mermaid-patterns 스코프 주석이 Mermaid=렌더링기법(Local/md 전용)임을 명시
- [ ] README 채널 표가 최종 매트릭스(capable html→Artifact / non-capable→Local / md→Local) 반영
- [ ] CHANGELOG에 항목 추가, marketplace.json 버전 minor 범프
- [ ] `plugin.json`/`marketplace.json` description이 "artifact-first 기본"을 반영
- [ ] `claude plugin validate .` 신규 경고 없음, 테스트 회귀 없음

### Blocked by

- S1, S2, S3, S4, S5
