# vision-powers: artifact-first 기본화 — 다이어그램 선택은 채널무관, Mermaid는 강등된 렌더링 (ADR 0009)

> 상태: **전체 S0~S6 구현 대기** (A안 빅뱅 확정, 검수반영 완료) · 생성: 2026-07-08 · 결정: 2026-07-10
> 용어집: `docs/context/vision-powers.md` (갱신 용어: **Channel**, **Diagram-type selection vs Rendering technique**, **Relational diagram vs Analytical chart**, **Readability vs Visibility**; **Artifact channel** opt-in→기본으로 재정의)
> 결정 근거: `docs/adr/0009-artifact-first-default-diagram-selection-channel-agnostic.md` (`0007` amend)
> 출처: grill-with-docs + domain-modeling 세션 (2026-07-08) — 로컬 vs 아티팩트 도그푸딩 체크포인트

## 배경

같은 소스를 두 채널로 렌더해 비교한 결과, built-in artifact-design가 로컬 design-system 룩을
디자인·가독성·가시성에서 이겼다(내용은 동률). ADR 0007이 "위임 디자인이 실망하면 Plan B"로 걸어둔
가정이 뒤집힌 것. 핵심 교훈: **Mermaid는 다이어그램 레이어가 아니라 하나의 렌더링 기법**이고, 진짜
자산은 "어떤 경우 어떤 다이어그램"이라는 **선택 지능**이다. ADR 0009는 이를 근거로 (a) capable
계정의 html에서 Artifact를 **기본 채널**로 승격, (b) Mermaid를 non-capable html·md **폴백**으로 강등
한다. 대상 스킬: `doc-visual`·`diff-visual`·`context-health-visual`·`plugin-visual` 기본 flip
(+ `fact-check`는 생성기가 아닌 제자리 검증 편집기라 "채널 신설"이 아니라 검증 후 아티팩트 대상
republish — S5 참조).

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
- **범위 = S0~S6 전부.** S2~S4(diff·context-health·plugin flip)는 S1 패턴의 기계적 복제 — 단
  **html 채널 기본 flip에 한정**. doc-visual(S1)만 `--format md --artifact` 게시를 지원하고 나머지
  셋은 의도적으로 미지원이므로, "S1 복제"를 md+artifact 게시 추가로 확대 해석하지 말 것.
- **S5(fact-check)는 성격 다름 — 검수로 재정의됨.** fact-check는 리포트 생성기가 아니라 **제자리
  검증 편집기**라 "채널 신설"이 아니라 **"검증 후 대상이 게시된 아티팩트면 같은 URL로 republish"**가
  맞는 모델(S5 참조). 원래 "제일 무거운 신설"이라던 판단은 이 재정의로 뒤집힘 — 신규 렌더 경로가
  아니라 republish 배선이다.
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

capable 계정에서 로컬을 강제하는 **force-local 오버라이드 플래그 `--local`**을 도입한다(분석형 차트·
줌/팬 필요 시). 이번 요청의 명시적 신호(플래그·자연어)는 항상 config보다 우선. 결정표·플래그
의미론은 공유 레퍼런스 문구로 두어 S1~S5가 인용한다.

**기본값 뒤집기의 실제 위치(중요 — 검수 정정).** `config.js`는 순수 get/set/path 키-값 저장소라
**뒤집을 기본로직이 없다**(`readConfig()`는 키 부재 시 `{}` 반환). "artifact 키 부재 = off" 해석은
각 스킬의 Format 표(`--artifact | switch | off`)와 Config-precedence 산문에 있다. 따라서 전역 flip =
**4개 flip 스킬의 표/산문에서 "부재 = artifact-first"로 해석을 뒤집는 것** + `config.js`는 헤더 주석만
갱신(코드 변경 없음). fact-check는 config를 읽지 않으므로 이 flip 대상 아님(S5 참조).

**persistent force-local.** flip 후 `--local`은 1회성이다. 로컬을 상시 기본으로 원하는 유저를 위해
`config` 키 `artifact: false`를 **persistent force-local**로 정의한다(플래그 `--local`의 config 짝).
4개 스킬이 이 값을 존중해야 한다.

**`--artifact` 플래그 운명(결정).** 기본이 아티팩트가 되면 `--artifact`는 capable html에서 잉여다.
**제거하지 않고 명시적 alias/no-op로 유지**(제거 시 기존 유저 근육기억·자연어 트리거가 깨짐). 규칙:
capable html에서 `--artifact`는 no-op(이미 기본), non-capable에서는 여전히 publish를 **시도**,
`--artifact`와 `--local`을 동시 지정하면 **`--local` 우선**. 각 스킬 arg-hint의
`[--artifact (native design + publish)]` 문구는 기본화에 맞게 재서술.

**capability 판별 기전(중요 — 검수 정정).** 코드에 "capable이냐"를 사전 판별하는 프리미티브가 없다
(publish를 시도해봐야 앎). 그러므로 라우팅은 **낙관적 시도 후 실패 시 재생성**: 기본(capable 가정)에서
아티팩트 fragment를 author→publish 시도→**실패/도구부재면 non-capable로 간주하고 풀 design-system +
Mermaid 로컬 리포트를 재생성**(fragment를 그냥 open하지 않는다 — 그건 Mermaid 없는 페이지라 ADR 0009
§3의 "non-capable엔 design-system+Mermaid 로컬" 약속을 위반). 비용 = non-capable 세션서 1회 재생성.

### Acceptance criteria

- [ ] force-local 플래그 이름 = **`--local` 확정** (자연어 동치 포함; `--no-artifact` 기각)
- [ ] 전역 기본해석 뒤집기 = **4개 flip 스킬의 Format 표/Config-precedence 산문에서 "artifact 키 부재
      = artifact-first"로 서술** + `config.js`는 **헤더 주석만** 갱신(코드 무변경 — config.js엔 뒤집을
      기본로직 없음)
- [ ] `config artifact: false` = **persistent force-local**로 정의, 4개 스킬이 존중
- [ ] `--artifact` = **alias/no-op로 유지**(제거 아님): capable html no-op, non-capable publish 시도,
      `--local`과 동시 지정 시 `--local` 우선. arg-hint 문구 재서술
- [ ] 명시적 요청 > config > 기본값 우선순위가 한 곳에 서술됨
- [ ] **capability 판별 = 낙관적 시도 후 실패 시 재생성** 기전 계약에 명시: publish 실패/도구부재 →
      풀 design-system+Mermaid 로컬 리포트 **재생성**(fragment open 금지 — ADR 0009 §3 준수)
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
- [ ] non-capable 세션(publish 실패/도구부재) → **풀 design-system+Mermaid 로컬 리포트 재생성**
      (Mermaid 없는 fragment를 open하지 않음) + 1줄 사유 고지
- [ ] md 출력 경로는 동작 불변
- [ ] arg-hint·publish 고지·README 행이 "기본 아티팩트"를 정확히 반영
- [ ] **publish 고지 문구 통일(1줄):** 기존 "Design delegated to Claude's built-in renderer…"와 신규
      "claude.ai에 게시함 — 로컬은 `--local`"을 **한 줄로 합친 정본 문구**를 여기서 확정 → S2~S4가 그대로
      복제(5개 스킬 문구 드리프트 방지)
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

S1 패턴을 context-health-visual에 복제. 현행 플래그(`--use-instructions-loaded-hook` + 008이 도입한
always-ask `/context` 프롬프트)와 `--local`이 충돌 없이 공존하는지 확인. (주의: `--paste-context`는
008/커밋 5676ca4에서 제거됨 — 존재하지 않는 플래그를 찾지 말 것.)

### Acceptance criteria

- [ ] capable html 기본 Artifact / force-local / non-capable degrade / md 불변 모두 동작
- [ ] 현행 플래그(`--use-instructions-loaded-hook`·always-ask /context 프롬프트)와 `--local` 공존 검증
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

## S5 — fact-check: 검증 후 대상이 게시된 아티팩트면 같은 URL로 republish (생성 아님)

### What to build

**검수 정정 — 원래 "채널 신설" 프레이밍 폐기.** fact-check는 리포트 **생성기가 아니다**:
`disable-model-invocation: true`, `allowed-tools`에 `Artifact`/`Skill(artifact-design)` 없음(`Edit`
있음), 동작은 "기존 리포트에서 주장 추출→소스 대조→**제자리 수정**→검증 요약 섹션 주입". 리포트를
author하지 않으므로 S0의 `capable × format → channel` 결정표·force-local·degrade·md 경로가 **매핑되지
않는다**.

맞는 모델 = **report-manager 8단계(republish-content-only)**. 검증 대상이 이미 게시된
`.artifact.html` fragment(옆에 `<report>.artifact.json` 사이드카 존재)면, 제자리 편집 후 **같은
claude.ai URL로 `url=` republish** + 사이드카 갱신. `gotchas.md`의 명시적 carve-out에 따라 이 경로는
artifact-design 프리로드·`Skill(artifact-design)` 권한 **불필요**. 대상이 로컬 파일이면 현행대로
제자리 편집만(채널 선택 없음 — 대상의 기존 채널을 따라감).

### Acceptance criteria

- [ ] `allowed-tools`에 `Artifact` 추가 (artifact-design 프리로드·Skill 권한은 불필요)
- [ ] 대상이 게시된 아티팩트 fragment(사이드카 존재) → 편집 후 **같은 URL로 republish** + 사이드카 갱신
- [ ] fragment 대상일 때 post-edit 게이트를 **`--content-only`로 전환**(현행은 항상 full 게이트 —
      `SKILL.md:207` — fragment를 오탐)
- [ ] 대상이 로컬 파일/비아티팩트 → 현행 제자리 편집 동작 불변 (채널 결정 없음)
- [ ] README에 fact-check republish 동작 반영 (arg-hint에 새 채널 플래그 **불필요** — 대상 따라감)

### Blocked by

- S0 (사이드카/URL 계약 참조), report-manager 8단계 패턴

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
- [ ] **README·manifest 스테일 문구 반전(구체):** README의 "Add `--artifact` to … instead of a local
      file" 문단·"Prefer never typing the flag?" 줄, `plugin.json`/`marketplace.json` description의
      "publish them as claude.ai Artifacts **via --artifact**"·"**so you don't need the flag every
      time**" — 전부 artifact-first 기본으로 반전(이제 `--local`이 예외 플래그)
- [ ] CHANGELOG에 항목 추가, marketplace.json 버전 범프. **minor(4.6.2→4.7.0) vs major 판단 명시:**
      기본 출력 위치가 로컬파일→claude.ai URL로 바뀌는 건 user-visible이나, 자동 degrade + `--local`로
      구동작 복원 + 제거된 플래그 없음 → **minor로 처리**(이 근거를 CHANGELOG에 1줄). 이견 시 major.
- [ ] `plugin.json`/`marketplace.json` description이 "artifact-first 기본"을 반영
- [ ] `claude plugin validate .` 신규 경고 없음, 테스트 회귀 없음

### Blocked by

- S1, S2, S3, S4, S5
