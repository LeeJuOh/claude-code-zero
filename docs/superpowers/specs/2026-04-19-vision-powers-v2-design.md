# vision-powers v2.0 Redesign — doc-visual 신설 및 Layer 0 공통 기반 도입

**Date**: 2026-04-19
**Status**: Design (brainstorming 결과)
**Scope**: vision-powers 플러그인의 major 버전 업(v2.0.0)
**Previous artefacts**: 없음 (이 문서가 스펙 원본)

---

## 1. 개요 및 동기

### 1.1 목표

vision-powers의 목표는 **"Claude Code가 만드는 텍스트 산출물(리서치 / 설계 / 계획 / diff / 플러그인 분석)을 다이어그램을 적극 활용한 마크다운/HTML로 변환해 사람이 빠르게 이해할 수 있게 한다"**.

현재 vision-powers는 이 목표를 부분적으로 달성하고 있으나 다음 한계가 있다:

1. **범용 "문서 → 시각화" 스킬 부재** — 임의의 research.md / RFC / ADR / spec 문서를 받아 시각화하는 입력 경로가 없음
2. **플러그인 전반의 다이어그램 미학 수준이 낮음** — Mermaid flowchart 과의존, 시맨틱 토큰 부재, complexity budget 미적용, pre-output taste gate 부재
3. **"검증" 기능에 과투자된 스킬이 실사용되지 않음** — plan-visual의 review/risk/gap 섹션, project-recap-visual의 cognitive debt 분석은 사용자가 실제로 사용하지 않음

### 1.2 참조 프로젝트

`references/diagram-design/` (Cathryn Lavery 作, MIT, https://github.com/cathrynlavery/diagram-design)의 다음 요소를 흡수한다:

- 13개 다이어그램 타입 분류 + selection guide
- 시맨틱 토큰 단일 소스 패턴 (paper / ink / accent / link)
- 타입별 complexity budget
- Pre-output taste gate
- "한 다이어그램은 가볍게, 여러 개로 쪼갠다" 원칙 (density rules 형태로 재포장)

흡수하지 않는 요소: inline SVG 렌더러, "다이어그램 1장 = HTML 1개" 모델, 첫 실행 URL-to-brand onboarding.

### 1.3 변경 요약

vision-powers v1.x → v2.0 (major bump, breaking change):

| # | 변경 | 비고 |
|---|---|---|
| 1 | **Layer 0 공통 기반 신설** | `references/design-system/` 개편 |
| 2 | **doc-visual 신규 스킬** | 임의 마크다운 → 다이어그램 강화 리포트 |
| 3 | **plan-visual 삭제** | 실사용 기능(시각화)은 doc-visual로 흡수, 분석 기능(검증)은 제거 |
| 4 | **project-recap-visual 삭제** | 사용자가 사용한 적 없음 |
| 5 | **diff-visual 다이어트** | 10섹션 → 7섹션 (시각화 중심) |
| 6 | **plugin-visual / context-health-visual에 Layer 0 적용** | 디자인 일관성 확보 |

영향 없음: `fact-check`, `report-manager`.

---

## 2. 아키텍처 — 2 레이어

```
┌──────────────────────────────────────────────────────────────┐
│ Layer 0 — 공통 기반 (references/design-system/)               │
│                                                              │
│   semantic-tokens.md         ← paper/ink/accent/link          │
│   diagram-type-selection.md  ← 13개 타입 selection guide      │
│   diagram-density-rules.md   ← complexity budget + focal rule │
│   taste-gate.md              ← pre-output 체크리스트          │
│   mermaid-patterns.md        ← 13 타입 syntax 보강 (기존 확장)│
│                                                              │
└──────────────────────────────────────────────────────────────┘
                            ▲ 강제 로드
          ┌─────────────────┼──────────────────┐
          │                 │                  │
┌─────────┴─────┐  ┌────────┴──────┐  ┌────────┴──────────────┐
│ doc-visual    │  │ diff-visual   │  │ plugin-visual /       │
│ (신규)        │  │ (다이어트)    │  │ context-health-visual │
└───────────────┘  └───────────────┘  └───────────────────────┘
  Layer 1 — 스킬별 도메인 로직 (입력 수집 + 섹션 구조)
```

**원칙**: 모든 Layer 1 스킬은 Layer 0의 selection guide / density rules / semantic tokens / taste gate를 강제 참조한다. 이를 통해 스킬 간 다이어그램 일관성과 품질을 확보한다.

---

## 3. Layer 0 파일 세부

### 3.1 `semantic-tokens.md`

**목적**: 색/폰트를 시맨틱 역할 이름(paper, ink, accent 등)으로만 참조하는 단일 소스. 기존 `color-palette.md`와 `font-system.md`를 흡수한다.

**시맨틱 역할**:

| Role | Purpose | Default (light) | Default (dark) |
|---|---|---|---|
| `paper`, `paper-2` | 페이지 배경, 컨테이너 배경 | `#faf7f2` | `#1c1917` |
| `ink` | 주 텍스트, 주 선 | `#1c1917` | `#faf7f2` |
| `muted`, `soft` | 보조 텍스트, 기본 화살표 | `#57534e` | `#a8a29e` |
| `rule`, `rule-solid` | 헤어라인 테두리 | rgba(28,25,23,.12) | rgba(250,247,242,.12) |
| `accent`, `accent-tint` | focal (1–2 elements per diagram) | `#b5523a` | `#d6724a` |
| `link` | HTTP/API, 외부 시스템 | `#2563eb` | `#60a5fa` |

**폰트 3종**:

| Role | Family | Usage |
|---|---|---|
| `title` | Instrument Serif 또는 대체 serif | 페이지 H1, 리포트 제목 |
| `body` | Geist 또는 대체 sans | 본문, 노드 이름 |
| `mono` | Geist Mono 또는 대체 mono | **기술 콘텐츠 한정** (포트, URL, 경로, 필드 타입) |

JetBrains Mono를 "블랭킷 dev 폰트"로 쓰는 것은 금지한다.

**Mermaid 매핑 표** (파일에 포함):

```
시맨틱 → themeVariables
paper          → canvasColor, background
ink            → primaryTextColor, primaryBorderColor
muted          → lineColor, secondaryTextColor
accent         → primaryColor (focal 노드)
accent-tint    → primaryColor fill tint
link           → edge color for external calls
```

**aesthetic-rotation.js 재정의**: 기존 "임의 팔레트 추첨"을 "이 파일에 사전 정의된 토큰 세트(warm-stone / cool-slate / editorial-ink / blueprint / ... N개) 중 로테이션"으로 교체한다. 로테이션 상태는 `${CLAUDE_PLUGIN_DATA}/aesthetic-history.json`에 저장(기존 위치).

### 3.2 `diagram-type-selection.md`

**목적**: `section-analyzer` subagent가 섹션 의미 → 다이어그램 타입 매핑 시 강제 참조.

**13개 타입 × Mermaid 매핑**:

| 의도 | 타입 | Mermaid syntax |
|---|---|---|
| Components + connections | architecture | `flowchart TD` + subgraph |
| Decision logic with branches | flowchart | `flowchart` with diamond |
| Time-ordered messages between actors | sequence | `sequenceDiagram` |
| States + transitions | state | `stateDiagram-v2` |
| Entities + fields | ER | `erDiagram` |
| Events positioned in time | timeline | `timeline` |
| Cross-functional handoffs | swimlane | `flowchart` with per-lane subgraph |
| Two-axis positioning | quadrant | `quadrantChart` |
| Hierarchy by containment | nested | `flowchart` with nested subgraph |
| Parent → children | tree | `flowchart TD` |
| Stacked abstraction | layer stack | `flowchart` with stacked subgraph |
| Set overlap | venn | **Mermaid 미지원** — SVG 또는 Chart.js fallback |
| Ranked hierarchy / funnel | pyramid | **Mermaid 미지원** — 수평 bar chart (Chart.js) fallback |

**Rules of thumb** (파일에 포함):

- 3-column 테이블로 같은 정보 전달이 가능하면 테이블 선택, 다이어그램 삭제
- 두 타입을 합치고 싶으면 지배 축 하나만 남김
- Complexity budget 초과 시 overview + detail 두 다이어그램으로 쪼갬

### 3.3 `diagram-density-rules.md`

**Complexity budget per type**:

| 항목 | Max |
|---|---|
| 전체 노드 | 9 |
| 전체 arrows / transitions | 12 |
| accent (focal) 개수 | **2** |
| sequence lifelines | 5 |
| swimlane lanes | 5 |
| quadrant items | 12 |
| ER entities | 8 |
| nested levels | 6 |
| tree depth | 4 |
| layer stack | 6 |
| venn circles | 3 |
| pyramid layers | 6 |

**Focal rule**: accent는 1-2개에만 적용. 4개 이상 accent = "focal을 결정하지 못한 상태" → 재설계.

**Split rule**: 위 한계 초과 시 overview 1장 + detail 1장으로 분리.

### 3.4 `taste-gate.md`

**Pre-output 체크리스트** (scripts/taste-gate.js가 JSON 규칙으로 실행):

**Type fit**:
- [ ] 타입이 의도에 맞나? (selection guide 표 재확인)
- [ ] 3-column 테이블이 같은 정보를 더 잘 전달? → 다이어그램 삭제

**Remove test**:
- [ ] 노드 하나 지워도 독자가 이해 가능? → 그 노드 불필요
- [ ] 두 노드가 항상 붙어 있나? → 하나로 병합
- [ ] arrow가 layout만으로 명백? → arrow 삭제

**Signal**:
- [ ] accent ≤ 2?
- [ ] legend가 전체 타입을 커버하고 쓸데없는 항목 없음?
- [ ] Complexity budget 준수?

**Technical**:
- [ ] arrow label에 opaque mask?
- [ ] `writing-mode: vertical` 없음?
- [ ] classDef에 `rgba()` 없음 (Mermaid 파서 깨짐)?
- [ ] sequence message에 `{}[]<>&` 없음?

**Typography**:
- [ ] 사람 이름 / 노드 이름 = body sans (mono 금지)?
- [ ] 기술 콘텐츠 (port, URL, path) = mono?
- [ ] JetBrains Mono 없음?

### 3.5 `mermaid-patterns.md` 확장 (기존 파일 업데이트)

현재 flowchart 중심인 예제를 13개 타입으로 확장한다. 각 타입별 섹션에 최소 1개의 완성 Mermaid 코드 예제 + 흔한 gotcha + Layer 0 토큰을 `%%{init}%%` 지시문으로 주입한 템플릿을 포함한다.

### 3.6 제거 대상 (Layer 0에 흡수됨)

| 파일 | 흡수처 |
|---|---|
| `references/design-system/color-palette.md` | `semantic-tokens.md` |
| `references/design-system/font-system.md` | `semantic-tokens.md` |
| `references/design-system/diagram-argumentation.md` | `diagram-density-rules.md` + `taste-gate.md` |
| `references/design-system/anti-slop-rules.md` | `taste-gate.md` |

유지: `css-patterns.md`, `libraries.md`, `navigation.md`.

---

## 4. doc-visual 스킬 상세

### 4.1 프론트매터

```yaml
---
name: doc-visual
description: 임의 마크다운 문서(research/spec/RFC/ADR/design)를 다이어그램 강화된 리포트로 변환.
  Use when asked to visualize, explain, or make a document easier to understand —
  "이 문서 다이어그램으로 깨줘", "visualize this research", "make this design doc easier to read".
argument-hint: "<md-file-path> [--format html|md] [--lang <code>]"
allowed-tools: Read, Glob, Grep, Agent, Bash(node *), Bash(open *), Bash(rm -rf /tmp/doc-visual-*)
---
```

### 4.2 입력

| 파라미터 | 필수 | 기본값 |
|---|---|---|
| `<md-file-path>` | ✅ | — |
| `--format` | ❌ | `html` |
| `--lang` | ❌ | 문서 언어 자동 감지 |

**입력 범위**: 단일 마크다운 파일만 (YAGNI — 디렉터리/URL/파이프는 Out of Scope).

### 4.3 파이프라인 (하이브리드)

```
[1] parse-markdown.js         (scripts/, deterministic)
      │   sections[] JSON 추출 (H1/H2/H3 계층, 본문, 코드블록, 기존 Mermaid)
      ▼
[2] section-analyzer          (agents/, subagent)
      │   Layer 0 selection guide 참조, 각 섹션의 의도 + 적합 다이어그램 타입 판단
      │   hero diagram 지정 (1-2개)
      ▼
[3] diagram-generator         (agents/, subagent)
      │   Layer 0 density rules + semantic tokens 참조
      │   섹션별 3-5줄 요약 + Mermaid 코드 생성 (%%{init}%%로 토큰 주입)
      ▼
[4] taste-gate.js             (scripts/, deterministic)
      │   Layer 0 체크리스트 강제, 위반 시 해당 섹션 diagram-generator 재호출 (max 2회)
      ▼
[5] assemble-report.js        (scripts/, deterministic)
      │   HTML (templates/doc-visual.html 신설) 또는 MD 조립
      ▼
    최종 출력
```

**결정론 vs LLM 분기**:
- 결정론(1/4/5): 빠르고 테스트 가능, Layer 0 준수 강제
- LLM(2/3): 의미 판단과 자연어 생성에 특화

### 4.4 에이전트 신설

두 에이전트는 플러그인 top-level `plugins/vision-powers/agents/`에 배치한다 (기존 `visual-report-writer.md`, `feature-architect.md` 등과 동일 위치).

#### `agents/section-analyzer.md`

**역할**: 각 섹션의 의미적 의도 파악, selection guide에 기반한 다이어그램 타입 할당, hero diagram 선정.

**입력**: `sections[]` (parse-markdown 출력), Layer 0 selection guide 내용

**출력**: `sections[]`에 `diagram_plan` 필드 추가
```json
{
  "section_id": "...",
  "heading": "...",
  "intent": "components-and-connections | decision-logic | time-ordered | ...",
  "diagram_type": "architecture | flowchart | sequence | ...",
  "is_hero": true | false,
  "skip_diagram": true | false  // 단순 텍스트 섹션은 skip
}
```

#### `agents/diagram-generator.md`

**역할**: 섹션별 요약 + Mermaid 코드 생성. density rules / semantic tokens 준수.

**입력**: `section_analyzer` 출력 + Layer 0 density rules + semantic tokens

**출력**: `sections[]`에 `summary` (3-5줄) + `mermaid_code` 필드 추가

### 4.5 섹션 배치 원칙

- **원본 md의 H1/H2/H3 구조를 그대로 유지** (사용자 결정: Q3-B)
- 각 섹션 = `H_n 제목` + `3-5줄 요약` + `0-1개 다이어그램`
- **Hero diagram 1-2개** — 문서 전체 개요, 보통 Executive Summary 또는 첫 H2에 배치

### 4.6 폴백

| 원본 상태 | 동작 |
|---|---|
| H2 없이 H1만 | section-analyzer가 단락 단위로 분할 (소량의 동적 구조화) |
| 문서 < 500자 | 1섹션 + hero 1개만 |
| 문서 > 10000자 | 모든 섹션 요약 강제, 다이어그램은 hero + 선별된 H2만 |
| 기존 Mermaid 블록 포함 | Layer 0 토큰으로 업그레이드 후 보존 |

### 4.7 출력 위치

- **HTML**: `${CLAUDE_PLUGIN_DATA}/reports/{doc-basename}-doc-visual.html`
- **MD**: 응답 본문 직접 전달 (디스크 저장 X, ephemeral — 기존 diff-visual `--format md` 패턴과 동일)

MD 모드에서도 Mermaid 코드블록에 `%%{init: { 'themeVariables': { ... } } }%%` 지시문으로 Layer 0 토큰을 주입하여 일관된 스킨 유지.

### 4.8 다국어

원본 문서 언어 자동 감지. `--lang` 명시 시 번역. 파일 경로 / 함수명 / 커밋 해시 / 기술 용어 / classification terms는 untranslated.

---

## 5. diff-visual 다이어트

### 5.1 섹션 변경 (10 → 7)

| 현재 섹션 | 변경 | 매핑 다이어그램 타입 |
|---|---|---|
| Overview / KPI | ✅ 유지 | — (텍스트 + chart) |
| File map | ✅ 강화 | tree / nested |
| Architecture impact | ✅ 유지 | architecture |
| Change classification | ✅ 유지 | pyramid 또는 chart |
| Dependency shift | ✅ **강화** | side-by-side subgraph (before/after) |
| New components | ✅ **신규** | architecture |
| Hot spots | ✅ **신규** | quadrant (영향 vs 빈도) |
| ~~Timeline~~ | ❌ 제거 | — |
| ~~Code Review~~ | ❌ 제거 | — |
| ~~Decisions & Rationale~~ | ❌ 제거 | — |
| ~~Risks & Gaps~~ | ❌ 제거 | — |
| ~~Test Coverage~~ | ❌ 제거 | — |

### 5.2 구체 파일 변경

- `skills/diff-visual/SKILL.md` — Data Gathering의 "code review" / "decision rationale" / "test coverage" / "risk" 분석 단계 제거
- `skills/diff-visual/references/section-structure.md` — 7섹션 구조로 전면 재작성
- `templates/diff-visual.html` — 5개 섹션 DOM 제거 + Hot spots / Dependency shift 신규 섹션 추가
- `agents/feature-architect.md` (사용 중이면) — review/decision 분석 요청 제거

### 5.3 Layer 0 적용

diff-visual은 Layer 0의 selection guide / density rules / semantic tokens / taste gate를 강제 참조한다. 기존 architecture/KPI 다이어그램은 시맨틱 토큰으로 재스킨.

---

## 6. 기존 스킬 Layer 0 참조 추가

| 스킬 | Layer 0 적용 | 변경 범위 |
|---|---|---|
| `diff-visual` | ✅ | §5와 묶어 진행 |
| `plugin-visual` | ✅ | 기존 `references/design-system/*` 중복 제거, Layer 0 강제 로드. 플러그인 아키텍처 다이어그램이 selection guide/density rules 준수 |
| `context-health-visual` | ✅ | 대시보드 차트 + 아키텍처 다이어그램이 Layer 0 토큰 사용 |
| `fact-check` | ❌ | 다이어그램 생성하지 않음 |
| `report-manager` | ❌ | 메타 스킬 |

---

## 7. 마이그레이션 / 삭제

### 7.1 plan-visual 삭제

- `plugins/vision-powers/skills/plan-visual/` 전체 디렉터리 삭제
- `plugins/vision-powers/templates/plan-visual.html` 삭제
- `plugins/vision-powers/.claude-plugin/plugin.json`의 description에서 관련 기능 제거
- 루트 `.claude-plugin/marketplace.json`에서 plan-visual 관련 설명 제거
- `plugins/vision-powers/README.md`의 스킬 목록 테이블에서 plan-visual 제거

### 7.2 project-recap-visual 삭제

동일 패턴으로 전체 제거.

### 7.3 메타데이터 / 릴리즈

- `.claude-plugin/marketplace.json`의 vision-powers 버전을 **2.0.0**으로 bump (major, breaking change)
- `marketplace.json` description 갱신: "plan-visual / project-recap-visual 제거, doc-visual 신설" 반영
- `plugin.json` description 동기화
- `README.md` 스킬 목록 테이블 전면 갱신 (doc-visual 추가, 삭제된 두 스킬 제거, diff-visual 설명 업데이트)
- `CHANGELOG.md`에 v2.0.0 entry 추가 (breaking changes 명시)

### 7.4 릴리즈 플로우 (CLAUDE.md §Git Workflow 준수)

1. develop 브랜치에서 모든 변경 구현
2. 로컬 테스트: `claude --plugin-dir ./plugins/vision-powers`
3. 검증: `unset CLAUDECODE && claude plugin validate .`
4. `git fetch origin` 후 tag 충돌 확인
5. main으로 `--no-ff` 머지
6. main에서 `v2.0.0` 태그
7. 사용자가 명시 요청 시에만 push

---

## 8. 테스트 / 에러 처리 / 성능

### 8.1 테스트 전략

| 레벨 | 방법 | 대상 |
|---|---|---|
| 유닛 | Node.js 테스트 | parse-markdown.js, taste-gate.js, assemble-report.js |
| 통합 (스킬) | 실제 md로 eval | research / RFC / ADR / spec / 문서 스타일별 각 1개 |
| 회귀 | diff-visual 변경 전후 output 비교 | 유지된 6개 섹션 품질 확인 |
| 시각 | 기존 visual self-audit 재사용 | headless Chrome PNG 렌더링 검증 |

### 8.2 에러 처리

| 실패 지점 | 동작 |
|---|---|
| 입력 md 없음 / 권한 없음 | 즉시 중단 + 명확한 에러 |
| parse-markdown: 깨진 md | 원본 텍스트를 H1 1개로 폴백, 경고 |
| section-analyzer: 섹션 판단 실패 | 해당 섹션 다이어그램 skip, 요약만 생성 |
| diagram-generator: 파서 깨지는 Mermaid 코드 | taste-gate가 catch → 재생성 (max 2회) |
| taste-gate: 2회 후에도 위반 | 해당 섹션 다이어그램 제외 + warn 로그, 리포트는 완성 |
| HTML 검증 (validate-report.js) 실패 | 에러 그대로 전달, 부분 완성 리포트 보존 |

### 8.3 성능

- section-analyzer / diagram-generator는 subagent → 섹션별 병렬 실행 가능 (각 섹션 독립)
- parse / taste-gate / assemble는 Node 스크립트 → ms 단위
- 긴 문서(>10000자): 섹션 요약 강제로 토큰 제한
- 비용: plan-visual의 blast radius / verification 단계가 사라지므로 유사 입력에 대해 v1.x보다 낮거나 비슷

---

## 9. Out of Scope (YAGNI)

본 릴리즈에서 **다루지 않는** 항목:

- 디렉터리 통째로 입력 (Q1에서 A 선택: 단일 파일만)
- URL / stdin / 파이프 입력
- 사용자 타입 override 플래그 (`--types`) — Q2에서 A(완전 자동) 선택
- inline SVG hero 모드 (diagram-design급 에디토리얼 품질) — v2.1+에서 검토
- PDF export
- 다이어그램 개별 PNG 분리 저장 (HTML 리포트 내 PNG export 기능은 유지)
- project-recap-visual 재설계 (삭제만)

---

## 10. 알려진 트레이드오프

| 트레이드오프 | 완화 방안 |
|---|---|
| 원본 구조 따르기 → 원본이 엉망이면 결과도 엉망 | 폴백 (H2 없으면 Claude가 단락 단위로 분할) |
| 완전 자동 타입 선택 → 예상 밖 타입 선택 가능성 | `report-manager refine`으로 섹션 재생성 (기존 기능) |
| Mermaid venn / pyramid 미지원 | selection-guide가 Chart.js/SVG fallback 명시 |
| subagent 병렬 실행 → 토큰 일시 증가 | 병렬도는 섹션 수에 비례. 필요 시 캡 도입 (구현 단계 판단) |

---

## 11. 브레인스토밍 결정 로그

각 주요 결정과 그 근거를 기록한다. 향후 재검토 시 참고.

| # | 질문 | 결정 | 근거 |
|---|---|---|---|
| Q1 | doc-visual 입력 범위 | **A — 단일 마크다운 파일** | YAGNI. "Claude 산출물 → 시각화"는 주로 단일 md |
| Q2 | 다이어그램 타입 선택 주체 | **A — Claude 완전 자동 + selection guide 내부 참조** | 문서 전체 시각화 규모상 사용자 섹션별 지정은 비현실적. refine 기능으로 보정 |
| Q3 | 섹션 구조 | **B + 소량 C 폴백 — 원본 md 구조 따르기, 구조 없으면 동적 분할** | 고정 템플릿(A)이 plan-visual 미사용의 한 원인 |
| Q4 | 원본 텍스트 처리 | **B — 섹션당 3-5줄 요약 + 다이어그램** | "빨리 이해" 목표, A(원본 보존)는 시간 단축 X, C(극단 압축)는 정보 유실 |
| Q5 | 마크다운 모드 다이어그램 | **A — Mermaid 코드블록 + `%%{init}%%` 로 시맨틱 토큰** | GitHub/Obsidian/Cursor가 기본 렌더. PNG fallback은 self-contained 깨짐 |
| Q6 | Layer 0 파일 구조 | **B — 기존 파일 통합/개편 후 Layer 0 깔끔 정리** | 본인 플러그인이라 migration 리스크 낮음, 일관성 우선 |
| Q7 | 마이그레이션 전략 | **A — 한 릴리즈에 전부 (major bump)** | Layer 0 도입과 기존 스킬 갱신은 시너지 강함, 중간 상태 회피 |
| Q8 | doc-visual 내부 아키텍처 | **3 — 하이브리드 (파이프라인 + subagent)** | 결정론 + LLM 의미 판단의 장점 결합, Layer 0 taste-gate 강제 가능 |

---

## 12. 구현 범위 요약 (writing-plans 단계로 넘어갈 입력)

새로 만들어야 할 것:
- `references/design-system/semantic-tokens.md`
- `references/design-system/diagram-type-selection.md`
- `references/design-system/diagram-density-rules.md`
- `references/design-system/taste-gate.md`
- `skills/doc-visual/SKILL.md`
- `skills/doc-visual/references/section-structure.md`
- `agents/section-analyzer.md` (플러그인 top-level)
- `agents/diagram-generator.md` (플러그인 top-level)
- `templates/doc-visual.html`
- `scripts/parse-markdown.js`
- `scripts/taste-gate.js`

수정할 것:
- `references/design-system/mermaid-patterns.md` — 13 타입 syntax 보강
- `scripts/aesthetic-rotation.js` — 토큰 세트 로테이션으로 재정의
- `scripts/assemble-report.js` — doc-visual 지원 추가
- `skills/diff-visual/SKILL.md` — 다이어트
- `skills/diff-visual/references/section-structure.md` — 7섹션 재작성
- `templates/diff-visual.html` — 섹션 DOM 갱신
- `skills/plugin-visual/` — Layer 0 강제 로드
- `skills/context-health-visual/` — Layer 0 강제 로드
- `README.md` — 스킬 목록 전면 갱신
- `CHANGELOG.md` — v2.0.0 entry
- `.claude-plugin/plugin.json` — description 갱신
- 루트 `.claude-plugin/marketplace.json` — 버전 2.0.0 + description 갱신

삭제할 것:
- `skills/plan-visual/` 전체
- `skills/project-recap-visual/` 전체
- `templates/plan-visual.html`
- `templates/project-recap.html`
- `references/design-system/color-palette.md`
- `references/design-system/font-system.md`
- `references/design-system/diagram-argumentation.md`
- `references/design-system/anti-slop-rules.md`

---

**다음 단계**: 본 스펙 사용자 리뷰 → `superpowers:writing-plans` 스킬로 구현 계획 작성.
