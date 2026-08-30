# 이슈 014 — diff-visual 다이어그램 그라운딩 하드닝 구현 (슬라이스 S1~S4)

> 상태: **ready-for-agent** — 구현 착수 전 · 생성: 2026-08-30
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
- [ ] Verification Checkpoint에 다이어그램 노드/엣지 그라운딩 문장 존재, authoring 규율로 명시
- [ ] 다이어그램 규칙에 phantom(점선) 관례 존재, 채널별 렌더(Mermaid/inline SVG) 명시, 캡션 사실-only 규칙
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
- [ ] 엣지가 전부 선언 노드로 향하는 Mermaid → 통과 / 허공 endpoint 있는 Mermaid → `mermaid-topology` 위반
- [ ] 위상 검사가 풀 게이트에만, content-only엔 미포함 (Artifact `--content-only`·md 회귀 없음)
- [ ] 모든 violation 객체에 `severity` 존재, 기존 `rule`/`hint` 그대로 — 기존 소비 무파손
- [ ] `node -e` 단위 확인: 통과 케이스 1 + 거부 케이스 1

**Blocked by**: None (S1과 독립, 병행 가능). 단 육안 검증은 S1 산출물과 함께.

### S3 — 저비용 레퍼런스 3건: generic 자가체크 · anti-slop 병합 · 다크모드 반전 (스토리 6, 7; 결정 D7, D8, D9)

**What to build**: `references/design-system/` 3개 파일 수정.
- **D7** `visual-self-audit.md`: "주제 바꿔도 같은 비주얼이 말 되면 뻔한 것" 자가체크 1줄.
- **D8** `anti-slop-tells.md`: effective-html의 costume 클리셰를 **behavioral 층에** 흡수(크림+serif+테라코타,
  보라→파랑 그라데이션, Inter/Space Grotesk, 이모지 마커, 전역 가운데 정렬, `rounded-lg` 남발 등). ⚠️ `:7`의
  "기계적 slop 재기술 금지" 지켜 hex는 다시 나열하지 않는다.
- **D9** `semantic-tokens.md`: "light `rgba(ink,X)` → dark `rgba(paper,X)` 반전" 규칙 1줄.

**Acceptance criteria**:
- [ ] 세 파일에 각 문구 존재
- [ ] `anti-slop-tells.md`에 hex 목록 재기술 0건(서술형 클리셰만)

**Blocked by**: None.

### S4 — 버전·문서 정리 (결정 D10, D11)

**What to build**: `marketplace.json` vision-powers 4.8.0 → 4.9.0. README diff-visual 절에 "다이어그램은 확인된
코드 이름에 그라운딩된다" 한 줄 선택적 추가(인터페이스 무변경이라 description 강제 변경 아님).

**Acceptance criteria**:
- [ ] `marketplace.json` vision-powers 4.9.0
- [ ] `unset CLAUDECODE && claude plugin validate .` 통과

**Blocked by**: S1, S2, S3.
