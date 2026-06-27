# vision-powers diff-visual 구조화 블록: 실제 코드를 보여준다 (Builder.io 흡수)

> 상태: 구현 대기 · 생성: 2026-06-27
> 용어집: `docs/context/vision-powers.md` (신규 용어: **Structured block**, **Build-time grounding**)
> 결정 근거: `docs/adr/0005-structured-block-grounding-via-extraction.md` (선행 `0002` 직접작성)
> 비교 레퍼런스: `references/builderIO-skills` (`visual-recap` / `visual-plan`)
> 출처: grill-with-docs + domain-modeling 세션

## What to build

`diff-visual`은 파일맵·아키텍처·변경분류·핫스팟 사분면을 그리지만 **정작 바뀐 코드 줄은 0개**다.
리뷰어가 제일 보고 싶은 게 코드인데 안 보인다 — 현재 최대 구멍. Builder.io `visual-recap`은
`split-diff`/`annotated-code`를 **headline**으로 쓰고, 그 블록을 **build-time grounded**(실제
diff에서 기계적으로 생성, 모델은 산문만)로 만든다.

이 패턴을 **우리 정체성(zero-runtime 자기완결 HTML)을 깨지 않고** 흡수한다. Builder.io의 렌더러
앱·라이브 피드백·MDX는 **서버에 묶여 있어** 가져오지 않는다 — 서버 없이 이식 가능한 것만:
**구조화 블록 + 빌드시점 grounding**.

**핵심 불변식 (절대 깨지 않음):**
- **zero-runtime 자기완결 `.html`** (ADR 0002). 렌더러/서버/노드 프로세스 도입 안 함. 더블클릭하면 열림.
- 구조화 블록은 **build-time grounded** — 사실(코드 줄·스키마 필드·라우트 계약)은 **diff에서 기계적으로
  추출**하고, 모델은 **고를 항목 + 주변 산문(왜/위험/주석)만** 쓴다 (ADR 0005). 추출 도구는 블록 종류별로
  다르다: 코드 블록(split-diff/annotated-code)은 `extract-hunks.js`(verbatim + HTML-escape), 스키마/라우트
  블록(data-model/api-endpoint)은 자체 **diff-aware 추출**(line-range hunk가 아니라 변경된 필드/계약을 뽑음).
  공통 원칙은 "모델이 사실을 재타이핑하지 않는다" — 도구가 `extract-hunks.js` 하나로 통일되는 게 아니다.
- syntax 하이라이트는 **runtime CDN**(`highlight.js`) — Mermaid CDN과 동형. 모델이 pre-highlight span을 박지 않는다(grounding 깨짐).
- **디자인 취향·레이아웃·CSS는 계속 모델 위임.** 공유 컴포넌트 스타일시트를 구워넣지 않는다 — 슬롭은
  토큰잠금 + anti-slop Tells + 시각 self-audit으로 이미 막는다 (CONTEXT "Leverage vs Delegation" 유지).
- **새 유저 플래그 0.** 블록은 **콘텐츠 자동감지**로 켜진다(기존 "섹션은 diff 내용에 따라 적응" 메뉴 확장).
- **단계화 + eval 게이트** (skill-creator-pro 베프: "제일 작은 걸 먼저, eval이 다음 투자처를 지목").

### 렌더링 결정 (그릴에서 확정)

| 항목 | 결정 |
|---|---|
| split-diff 레이아웃 | 좌(before)/우(after) 나란히. 각 면을 highlight.js가 정상 칠함 → per-line `+/−` 색과 토큰색이 겹치는 골치 회피 |
| 다중 파일 묶기 | 파일당 `<details>` 접이식, 핵심 1-2개만 열어둠 (JS 0, 네이티브, anti-slop-tells가 이미 권하는 패턴) |
| 예산 | 코드블록 3-8 파일, 파일당 ≤150줄, 초과 시 `(+N more)` |
| 라이브러리 | `highlight.js` + github/github-dark, `prefers-color-scheme` 토글. 명시 언어클래스(`language-ts`) — 확장자로 알기에 자동감지 오판 회피. github 테마는 금지 보라색 안 씀 |
| grounding 메커니즘 (코드 블록) | `extract-hunks.js (scope, file, line-range)` → 정확한 hunk를 HTML-escape해 출력. 모델은 추출물을 붙이고 산문만. *스키마/라우트 블록(S4/S5)은 자체 diff-aware 추출 — 아래 슬라이스 참조* |
| 좁은 화면 | 컬럼 세로 stack (`min-width:0`) |

### 슬라이싱 원칙 (tracer bullet)

각 슬라이스 = **블록 1종을 `script → reference → skill → render → gate → eval` 전 층 관통**.
별도의 "인프라 먼저" 가로 이슈는 만들지 않는다 — **S1이 최소 인프라(`extract-hunks.js`,
`structured-blocks.md`)를 자기 수직 절단의 일부로 만들고**, 이후 슬라이스가 그것을 확장한다.

매핑: **Phase 1 = S1 + S2** · **Phase 2 = S3** · **Phase 3 = S4 + S5 + S6**.

---

## S1 — split-diff 엔드투엔드 ⭐ (tracer bullet)

### What to build

`diff-visual`에 **"Key Changes" 섹션**을 신설해 의미 있는 코드 hunk를 좌/우 split-diff로 보여준다.
이 슬라이스가 전체 파이프라인(추출 스크립트 → 공유 레퍼런스 → 스킬 배선 → CDN 렌더 → 게이트 →
eval)을 **블록 1종으로 끝까지 입증**한다. 데모: "`diff-visual` 돌리면 이제 바뀐 코드가 좌/우로
보이고, 핵심 파일만 펼쳐져 있다."

### Acceptance criteria

- [ ] `scripts/extract-hunks.js` 신규: `(scope, file, line-range)` → git에서 정확한 hunk를 **verbatim + HTML-escape**해 출력. 바이너리/존재하지 않는 파일/빈 diff 안전 처리.
- [ ] `references/design-system/structured-blocks.md` 신규: split-diff HTML/CSS 패턴 + highlight.js CDN 셋업(테마 토글, 언어클래스) + 예산(3-8 / ≤150) + **build-time grounding 규칙**. 다른 스킬도 읽도록 범용 작성.
- [ ] `diff-visual` SKILL.md에 "Key Changes" 배선: 의미 있는 코드 hunk **자동감지** 시 split-diff 렌더, 파일당 `<details>`(핵심 1-2 열림), 코드는 `extract-hunks.js`로 채우고 모델은 한 줄 summary + 소수 주석만.
- [ ] `diff-visual` `description` 갱신 — "실제 바뀐 코드도 보여줌" 반영(트리거/기대 일치).
- [ ] 네트워크 0(highlight.js 못 받음)이면 **단색 monospace로 degrade**, 깨지지 않음.
- [ ] `artifact-gate.js` 통과 확인 — verbatim/escape는 `extract-hunks.js`가 보장하므로 게이트 추가검사 불필요한지 검증, 필요하면 코드블록 예산검사를 게이트 후보로 메모(강제 아님).
- [ ] **eval**: 실제 diff 2-3개에 with-skill(신규) vs baseline(현 `diff-visual`) 벤치마크 + 뷰어. 코드 섹션이 리뷰 신호를 더하는지 정성+정량 확인 (skill-creator-pro 루프).

### Blocked by

- None — 즉시 시작 가능 (최소 인프라를 자기 안에서 만듦).

---

## S2 — File Map change-flags

### What to build

기존 File Map 다이어그램에 파일별 **변경 플래그**(added / removed / modified / renamed)를 색/표시로
입혀, 펼치기 전에도 변경 footprint가 한눈에 보이게 한다. 데모: "File Map이 추가/삭제/수정/이름변경을
색코딩."

### Acceptance criteria

- [ ] File Map이 파일별 change-flag를 표시. 색은 semantic-tokens 팔레트 내(금지 보라색 회피), 다크모드서도 읽힘.
- [ ] 플래그는 `git ... --name-status`에서 **기계적으로 도출**(grounding) — 모델 추정 금지.
- [ ] `artifact-gate.js` + 시각 self-audit 통과.
- [ ] S1의 eval 하니스에 포함.

### Blocked by

- None — `extract-hunks.js` 불필요, S1과 독립. *S1과 병합 가능(둘 다 Phase 1 / diff-visual 렌더) — 구현 시 판단.*

---

## S3 — annotated-code

### What to build

새로 추가된 파일이나 큰 추가 블록을 한쪽짜리 split이 아니라 **annotated-code**(코드 + 특정 줄
여백 주석)로 보여준다. S1의 인프라(`extract-hunks.js`, `structured-blocks.md`, eval 하니스)를
재사용·확장한다.

### Acceptance criteria

- [ ] `structured-blocks.md`에 annotated-code 섹션 추가 (코드 + 줄-anchor 주석 패턴).
- [ ] `extract-hunks.js`에 모드 추가 또는 확장: 새 파일/추가 블록의 코드 + 줄범위 추출(verbatim + escape).
- [ ] `diff-visual`: 새 파일/큰 추가 블록 자동감지 시 annotated-code 렌더. 코드는 추출, **주석(anchor note)만 모델**.
- [ ] eval에 새 파일 포함 diff 케이스 추가.

### Blocked by

- S1.

---

## S4 — data-model 블록

### What to build

마이그레이션/스키마 변경을 감지해 **엔티티·필드 변경표**(added/modified/removed/renamed flag,
타입 변경 시 `was`)로 보여준다. extract-then-prose: 필드는 diff에서 기계 추출, 모델은 산문.

### Acceptance criteria

- [ ] 마이그레이션/스키마 변경 **자동감지** (Prisma / Drizzle / Rails / 원시 SQL 등 흔한 패턴).
- [ ] `structured-blocks.md`에 data-model 섹션 (변경표 + change flag + `was` 필드).
- [ ] `diff-visual`: 스키마 변경 시 data-model 블록 렌더. 필드/변경플래그/`was`는 마이그레이션 diff에서 **스키마-aware 추출**(코드 hunk가 아님 — `extract-hunks.js` 미사용), 산문만 모델.
- [ ] 스키마 변경 포함 diff로 eval.

### Blocked by

- S1.

---

## S5 — api-endpoint 블록

### What to build

라우트/핸들러 변경을 감지해 **엔드포인트 계약 카드**(method / path / params / request / response,
change flag, 제거 시 deprecated)로 보여준다. S4와 병렬.

### Acceptance criteria

- [ ] 라우트/핸들러 변경 **자동감지** (Express / FastAPI / Rails routes 등 흔한 패턴).
- [ ] `structured-blocks.md`에 api-endpoint 섹션 (method/path/params/req/res 카드 + change flag).
- [ ] `diff-visual`: 라우트 변경 시 api-endpoint 블록 렌더. method/path/params/계약은 **라우트-aware 추출**(코드 hunk가 아님 — `extract-hunks.js` 미사용), 산문만 모델.
- [ ] 라우트 변경 포함 diff로 eval.

### Blocked by

- S1.

---

## S6 — annotated-code를 doc-visual / plugin-visual로 확장

### What to build

`structured-blocks.md`를 재사용해 코드 블록을 형제 스킬로 넓힌다. `doc-visual`은 문서에 박힌 코드
샘플에, `plugin-visual`은 훅/스크립트 핵심 코드에 annotated-code를 채택한다. (diff/마이그레이션
개념이 없으므로 split-diff/data-model이 아니라 annotated-code만.)

### Acceptance criteria

- [ ] `doc-visual`: 문서에 코드 샘플이 있을 때 annotated-code 채택.
- [ ] `plugin-visual`: 훅/스크립트 핵심 코드를 annotated-code로 (이미 7단계 거대 — 가볍게 추가).
- [ ] `structured-blocks.md`를 두 스킬 reference 목록에 연결.
- [ ] 각 스킬 eval.

### Blocked by

- S3.
