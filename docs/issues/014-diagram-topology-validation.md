# 이슈 014 — diff-visual 다이어그램 그라운딩 하드닝 구현 (슬라이스 S1~S4)

> 상태: **구현 완료** — S1~S4 전부 구현, 실행 검증 2건만 남음 · 생성: 2026-08-30 · 갱신: 2026-09-05
> 스펙 (PRD): `docs/specs/014-diagram-topology-validation.md` — 문제 정의, 유저 스토리, 결정 D1~D11 전부 스펙 참조
> 대상 플러그인: `plugins/vision-powers/` (v4.8.0 → v4.9.0)
> Seam: `skills/diff-visual/SKILL.md` + `scripts/artifact-gate.js` + `references/design-system/*.md` 3개. 검증은 실제 diff 생성 + 게이트 순수함수 단위 확인 + 육안.
> 용어집: `docs/context/vision-powers.md` — **Diagram grounding / Internal consistency / Phantom node** · ADR: 0011
> 착수 전 필수: `docs/reference/gotchas.md`(구조 변경 트랩) + 공식 문서(`https://code.claude.com/docs/llms.txt`) 확인 — AGENTS.md 규칙.

## Slices (tracer bullets)

의존 순서: S1 → S2. S3·S4는 S1 이후 언제든. S4는 마지막.

### S1 — diff-visual SKILL.md: 그라운딩 지시 + phantom 노드 관례 (스토리 1, 4; 결정 D1, D5)

**What to build**: `skills/diff-visual/SKILL.md` 두 곳 수정.
1. **Verification Checkpoint 확장(D1)**: Name check(현재 "diff 또는 탐색한 소스 file:line에 존재")에 한 줄
   추가 — "다이어그램 노드 라벨·엣지 endpoint도 이 확인된 이름 집합에서만 뽑는다. 확인 안 된 이름으로 노드/엣지를
   만들지 않는다." authoring 규율임을 명시(게이트 강제 아님, ADR 0011).
2. **Phantom 노드 관례(D5)**: Intuition 흐름도·Code 의존 그림 규칙에 추가 — before/after에서 삭제·이동된
   요소는 점선 노드/엣지로 표기. 로컬=Mermaid 점선(`-.->`, `stroke-dasharray`), Artifact=inline SVG
   `stroke-dasharray`. 캡션은 사실만("removed"/"moved to X"), 판단 문장 금지.

**Acceptance criteria**:
- [x] Verification Checkpoint에 다이어그램 노드/엣지 그라운딩 문장 존재, authoring 규율로 명시
- [x] 다이어그램 규칙에 phantom(점선) 관례 존재, 채널별 렌더(Mermaid/inline SVG) 명시, 캡션 사실-only 규칙
- [ ] 실제 diff(의존 변화 있음)로 Artifact·`--local` 생성 시: 모든 다이어그램 노드 이름이 fact sheet 이름 집합 내
- [ ] 삭제 요소가 있는 diff에서 해당 요소가 점선으로 렌더(양 채널)

**Blocked by**: None.

### S2 — artifact-gate.js: 위상 내부 일관성 검사 + 구조화 진단 (스토리 3, 5; 결정 D2, D6)

**What to build**: `scripts/artifact-gate.js` 수정.
1. **내부 일관성 검사 신설(D2)**: `checkMermaidTopology(html)` 추가 — 각 `<pre class="mermaid">` 블록에서
   엣지(`-->`/`.->`/`==>`/`-.->`) 양끝 id를 뽑고, 그 다이어그램의 **선언된 노드 집합**(기존 `countNodes`
   로직 재사용 — `A[..]`/`A{..}`/`A(..)`/서브그래프 id 등)에 없는 endpoint가 있으면 위반. `runArtifactGate`의
   **풀 게이트에만** 추가(content-only 목록엔 넣지 않음 — Artifact/SVG엔 대상 없음, ADR 0011). 위반 rule =
   `mermaid-topology`.
2. **구조화 진단(D6)**: 모든 `violations.push`에 `severity`('error'|'warn') 추가, 신규 위상 검사엔 필요 시
   `supportedFixes` 힌트. **기존 `{rule, hint}` 필드는 유지**(소비처 호환) — 추가만.

**Acceptance criteria**:
- [x] 엣지가 전부 선언 노드로 향하는 Mermaid → 통과 / 허공 endpoint 있는 Mermaid → `mermaid-topology` 위반
- [x] 위상 검사가 풀 게이트에만, content-only엔 미포함 (Artifact `--content-only`·md 회귀 없음)
- [x] 모든 violation 객체에 `severity` 존재, 기존 `rule`/`hint` 그대로 — 기존 소비 무파손
- [x] `node -e` 단위 확인: 통과 케이스 1 + 거부 케이스 1

**Blocked by**: None (S1과 독립, 병행 가능). 단 육안 검증은 S1 산출물과 함께.

### S3 — 저비용 레퍼런스 3건: generic 자가체크 · anti-slop 병합 · 다크모드 반전 (스토리 6, 7; 결정 D7, D8, D9)

**What to build**: `references/design-system/` 3개 파일 수정.
- **D7** `visual-self-audit.md`: "주제 바꿔도 같은 비주얼이 말 되면 뻔한 것" 자가체크 1줄.
- **D8** `anti-slop-tells.md`: effective-html의 costume 클리셰를 **behavioral 층에** 흡수(크림+serif+테라코타,
  보라→파랑 그라데이션, Inter/Space Grotesk, 이모지 마커, 전역 가운데 정렬, `rounded-lg` 남발 등). ⚠️ `:7`의
  "기계적 slop 재기술 금지" 지켜 hex는 다시 나열하지 않는다.
- **D9** `semantic-tokens.md`: "light `rgba(ink,X)` → dark `rgba(paper,X)` 반전" 규칙 1줄.

**Acceptance criteria**:
- [x] 세 파일에 각 문구 존재
- [x] `anti-slop-tells.md`에 hex 목록 재기술 0건(서술형 클리셰만)

**Blocked by**: None.

### S4 — 버전·문서 정리 (결정 D10, D11)

**What to build**: `marketplace.json` vision-powers 4.8.0 → 4.9.0. README diff-visual 절에 "다이어그램은 확인된
코드 이름에 그라운딩된다" 한 줄 선택적 추가(인터페이스 무변경이라 description 강제 변경 아님).

**Acceptance criteria**:
- [x] `marketplace.json` vision-powers 4.9.0
- [x] `unset CLAUDECODE && claude plugin validate .` 통과

**Blocked by**: S1, S2, S3.

---

## 세션 핸드오프 (2026-09-05, 2차)

### First Action

**S1의 실행 검증 2건을 돈다** — 코드 작업은 S1~S4 전부 끝났고 커밋됐다. 남은 것은 실제 diff로
`diff-visual`을 돌려 육안 확인하는 것뿐. 아래 "남은 작업" 참조.

### 리포 상태

- 브랜치 `develop`. 구현 커밋 1건(아래) + 그 앞에 문서 커밋 `d85640a`. **미푸시**.
- 검증: `node --test plugins/vision-powers/scripts/artifact-gate.test.js` → 62/62 통과.
  `unset CLAUDECODE && claude plugin validate .` → 통과(경고 11건은 전부 로컬 플러그인의
  `plugin.json version 미지정`으로 AGENTS.md 규칙대로라 정상, 이 변경과 무관).

### S1 — 완료 (코드)

`diff-visual/SKILL.md` 3곳:
- Verification Checkpoint의 Name check에 다이어그램 그라운딩 문장 (`"Diagrams are prose too"`로 시작).
  authoring 규율이며 게이트 강제가 아님을 ADR 0011 참조와 함께 명시.
- Intuition 섹션에 phantom 관례 bullet (`"Phantom notation for what's gone"`). 채널별 렌더 명시.
- Code 의존 그림 bullet에서 같은 phantom 표기를 재사용하도록 연결.

### S2 — 완료

`scripts/artifact-gate.js`:
- `checkMermaidTopology()` 신설. 헬퍼 `declaredNodeIds()` / `edgePairs()` / `stripShapes()`.
  `runArtifactGate`의 **풀 게이트에만** 배선, content-only 목록에는 없음. 위반 rule = `mermaid-topology`.
- 모든 `violations.push`에 `severity` 추가, 기존 `rule`/`hint` 필드 유지.
- 위상 위반에 `supportedFixes` — `declare-node` / `rename-endpoint`(+ 선언 id 후보 목록).
- `artifact-gate.test.js`에 13개 테스트 추가 (통과/거부/오탐가드/풀-vs-content-only/severity/supportedFixes).

### S3 — 완료

- **D7** `visual-self-audit.md`: 육안 rubric 표에 **Specificity** 행 추가 — "주제를 바꿔도 그림이
  말이 되면 이 변경의 그림이 아니다". Tie-in은 Tell #3·#6.
- **D8** `anti-slop-tells.md`: **Tell #8 "Borrowed costume"** 신설. 크림+serif+테라코타 세트,
  그라데이션 히어로, Inter/Space Grotesk, 이모지 섹션 마커, 전역 가운데 정렬, 균일 rounded 카드.
  hex 재기술 0건(`grep '#[0-9a-fA-F]{3,8}'` → 0) — `:7`의 "기계적 slop 재기술 금지" 준수.
- **D9** `semantic-tokens.md`: 역할 표 아래에 반전 규칙 — light `rgba(ink,X)` → dark `rgba(paper,X)`,
  같은 alpha. `rule` hairline의 기존 두 값이 왜 그런지를 설명하는 형태로.

### S4 — 완료

- `marketplace.json` vision-powers **4.8.0 → 4.9.0**.
- README diff-visual 절 Intuition 행에 그라운딩 + phantom 한 문장 추가(D10 선택 항목).

### 스펙에 없던 판단 5건 (다음 세션이 재논쟁하지 말 것)

1. **`-.->` 의미 충돌 해소.** `mermaid-patterns.md`의 화살표 표에서 `-.->`는 이미 "Optional, async,
   fallback"이었다. D5가 같은 기호를 phantom에 배정해 독자가 "삭제됨"과 "선택 경로"를 구분할 수 없게 된다.
   → 표에 phantom 행 + `classDef phantom`(흐린 점선)을 추가해 **점선+흐림 = 삭제**로 갈랐다.
   `mermaid-patterns.md`는 어느 슬라이스의 대상 파일도 아니었음 — 사용자 승인 받고 수정.
2. **오탐 방지 — 다이어그램 타입 제한.** 위상 검사는 flowchart·state에만 돈다. sequence의 `A-->>B`,
   ER의 `||--o{`에 같은 정규식을 돌리면 없는 endpoint를 지어낸다.
3. **오탐 방지 — 암묵 스타일 스킵.** 도형 선언이 0개인 다이어그램(`A --> B`, id가 곧 라벨)은 비교할
   선언 집합이 없어 전 엣지가 위반으로 터진다 → 통째로 스킵.
4. **`artifact-gate.md` 문서화.** S2의 대상 파일 목록엔 없었지만, 새 규칙이 레퍼런스에 없으면 위반을
   고치는 모델이 규칙을 모른다. check 11 + severity/supportedFixes 설명 추가.
5. **D8을 8번째 Tell로 넣고 SKILL.md 4개를 동기화.** `anti-slop-tells.md`는 "The seven Tells" 구조이고
   `diff-visual`·`doc-visual`·`plugin-visual`·`context-health-visual` SKILL.md가 본문에서 "seven
   authoring reflexes" + 7개 이름을 나열하고 있었다. 번호 없는 별도 섹션으로 넣으면 그 4개를 안 건드려도
   되지만 파일의 name/why/Before→After 규약 밖에 항목 하나가 생긴다 → 규약을 지키고 4개 파일의
   "seven"→"eight" + 이름 목록을 같이 고쳤다. S3 선언 파일 3개를 넘어선 유일한 확장.
   (`grep "seven authoring reflexes\|seven Tells"` → 0건으로 확인.)

### 남은 작업

- **S1 실행 검증 2건 (AC 3·4).** 실제 diff로 Artifact·`--local` 리포트를 생성해 (a) 모든 다이어그램
  노드 이름이 fact sheet 이름 집합 안인지 (b) 삭제 요소가 점선으로 렌더되는지 육안 확인.
  고정 테스트 diff는 이 레포의 실제 커밋 하나(의존 변화 있는 것)를 쓴다. 이슈의 해당 AC 2줄은
  아직 미체크 상태로 남겨 뒀다.
- **`severity`가 전부 `'error'`다.** 어떤 위반이든 게이트를 실패시키므로 값이 하나뿐 — 필드의 정보량이 0이다.
  `warn`을 진짜 non-blocking으로 만들려면 `runArtifactGate`의 `ok` 판정을 바꿔야 하는데, 그건 스펙 밖이라
  손대지 않았다. 이슈 AC("모든 violation에 severity 존재")는 충족. 판단이 필요하면 사용자에게 물을 것.
- **미푸시.** AGENTS.md대로 사용자가 명시적으로 요청할 때만 푸시.

### 폐기된 핸드오프

`docs/handoff/vision-powers/2026-08-30-vision-powers-improvement-analysis.md`를 삭제했다(이 커밋에 포함).
그 문서의 First Action(스펙 014 작성)이 `d85640a`로 완료되어 역할이 끝났고, 분석의 결론은 전부
`docs/specs/014` · `docs/adr/0011`에 들어가 있다. 이후 상태는 이 이슈 문서가 이어받는다.
