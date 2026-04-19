# vision-powers v2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** vision-powers 플러그인을 v2.0으로 재설계 — Layer 0 공통 기반 4개 파일 신설, doc-visual 신규 스킬 추가, plan-visual / project-recap-visual 삭제, diff-visual 다이어트, 기존 스킬 Layer 0 참조 적용.

**Architecture:** 2 레이어 구조 — Layer 0(공통 기반, `references/design-system/`)이 시맨틱 토큰 / 13개 다이어그램 타입 분류 / density rules / taste gate를 제공하고, Layer 1(스킬별 도메인) doc-visual/diff-visual/plugin-visual/context-health-visual이 이를 강제 참조. doc-visual은 하이브리드 파이프라인 (parse-markdown.js → section-analyzer subagent → diagram-generator subagent → taste-gate.js → assemble-report.js).

**Tech Stack:** Node.js (기존 vision-powers scripts 인프라), Mermaid 11, Chart.js, Claude subagent (Agent 도구), Bash. 추가 런타임 의존성 없음.

**Spec:** `docs/superpowers/specs/2026-04-19-vision-powers-v2-design.md`

---

## File Structure

### 생성 (Create)

```
plugins/vision-powers/
  references/design-system/
    semantic-tokens.md              # Task 1
    diagram-type-selection.md       # Task 2
    diagram-density-rules.md        # Task 3
    taste-gate.md                   # Task 4

  skills/doc-visual/
    SKILL.md                        # Task 13
    references/section-structure.md # Task 14

  agents/
    section-analyzer.md             # Task 9
    diagram-generator.md            # Task 10

  templates/
    doc-visual.html                 # Task 11

  scripts/
    parse-markdown.js               # Task 7 (TDD)
    parse-markdown.test.js          # Task 7
    taste-gate.js                   # Task 8 (TDD)
    taste-gate.test.js              # Task 8

  CHANGELOG.md                      # Task 21 (신규)
```

### 수정 (Modify)

```
plugins/vision-powers/
  references/design-system/mermaid-patterns.md   # Task 5
  scripts/aesthetic-rotation.js                  # Task 15
  scripts/assemble-report.js                     # Task 12
  skills/diff-visual/SKILL.md                    # Task 16
  skills/diff-visual/references/section-structure.md  # Task 16
  templates/diff-visual.html                     # Task 17
  skills/plugin-visual/SKILL.md                  # Task 18
  skills/context-health-visual/SKILL.md          # Task 18
  references/report-generation-workflow.md       # Task 12
  README.md                                      # Task 21
  .claude-plugin/plugin.json                     # Task 20

.claude-plugin/marketplace.json                  # Task 20 (루트)
```

### 삭제 (Delete)

```
plugins/vision-powers/
  skills/plan-visual/                            # Task 19
  skills/project-recap-visual/                   # Task 19
  templates/plan-visual.html                     # Task 19
  templates/project-recap.html                   # Task 19
  references/design-system/color-palette.md      # Task 6
  references/design-system/font-system.md        # Task 6
  references/design-system/diagram-argumentation.md  # Task 6
  references/design-system/anti-slop-rules.md    # Task 6
```

---

## Phase 1 — Layer 0 공통 기반

### Task 1: Layer 0 — semantic-tokens.md 작성

**Files:**
- Create: `plugins/vision-powers/references/design-system/semantic-tokens.md`

- [ ] **Step 1: 파일 작성** — 내용 구조 (스펙 §3.1 기반):

```markdown
# Semantic Tokens

vision-powers의 단일 색/폰트 소스. 모든 Layer 1 스킬은 이 파일의 **시맨틱 역할**로만 색과 폰트를 참조한다.

## 시맨틱 역할

| Role | Purpose | Default (light) | Default (dark) |
|---|---|---|---|
| `paper`, `paper-2` | 페이지/컨테이너 배경 | `#faf7f2` | `#1c1917` |
| `ink` | 주 텍스트/주 선 | `#1c1917` | `#faf7f2` |
| `muted`, `soft` | 보조 텍스트/기본 화살표 | `#57534e` | `#a8a29e` |
| `rule` | 헤어라인 | rgba(28,25,23,.12) | rgba(250,247,242,.12) |
| `accent`, `accent-tint` | focal (1–2 / diagram) | `#b5523a` | `#d6724a` |
| `link` | HTTP/API/외부 | `#2563eb` | `#60a5fa` |

## 폰트 3종

| Role | Family | Usage |
|---|---|---|
| `title` | Instrument Serif | 페이지 H1, 리포트 제목 |
| `body` | Geist (sans) | 본문, 노드 이름 |
| `mono` | Geist Mono | 기술 콘텐츠 한정 (포트/URL/경로) |

**JetBrains Mono를 블랭킷 dev 폰트로 쓰지 않는다.** Mono는 기술 콘텐츠 전용.

## Mermaid themeVariables 매핑

```
paper        → canvasColor, background
ink          → primaryTextColor, primaryBorderColor
muted        → lineColor, secondaryTextColor
accent       → primaryColor (focal 노드)
link         → 외부 edge color
```

사용 예:
~~~
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#b5523a',
    'primaryBorderColor': '#1c1917',
    'lineColor': '#57534e',
    'primaryTextColor': '#1c1917'
  }
}}%%
~~~

## 토큰 세트 (aesthetic-rotation.js용)

aesthetic-rotation.js가 다음 세트 중 하나를 선택:

1. **warm-stone** (default, light) — 위 표의 기본값
2. **cool-slate** — paper `#f1f5f9`, ink `#0f172a`, accent `#0369a1`
3. **editorial-ink** — paper `#fafaf9`, ink `#18181b`, accent `#7c2d12`
4. **blueprint** — paper `#eff6ff`, ink `#1e3a8a`, accent `#dc2626`
5. **warm-stone-dark** — 위 dark 컬럼
6. **cool-slate-dark** — cool-slate의 역전

## FORBIDDEN

- `rgba()` in Mermaid classDef (파서 붕괴 — 8-digit hex `#RRGGBBAA` 사용)
- violet/fuchsia 계열 (`#8b5cf6`, `#7c3aed`, `#a78bfa`, `#d946ef`) 기본 팔레트
- JetBrains Mono 블랭킷 사용
```

- [ ] **Step 2: 검증** — Read 또는 `cat`으로 확인. 표 6개가 전부 포함됐는지.

- [ ] **Step 3: Commit**

```bash
git add plugins/vision-powers/references/design-system/semantic-tokens.md
git commit -m "Add Layer 0 semantic-tokens.md — unified color and font source for all vision-powers skills"
```

---

### Task 2: Layer 0 — diagram-type-selection.md 작성

**Files:**
- Create: `plugins/vision-powers/references/design-system/diagram-type-selection.md`

- [ ] **Step 1: 파일 작성** (스펙 §3.2 기반):

```markdown
# Diagram Type Selection

section-analyzer와 diagram-generator가 섹션 의도 → 다이어그램 타입 매핑 시 **강제 참조**하는 단일 소스.

## 13개 타입 selection guide

| 섹션에서 보여주려는 것 | 타입 | Mermaid syntax |
|---|---|---|
| Components + connections (system overview) | architecture | `flowchart TD` + `subgraph` |
| Decision logic with branches | flowchart | `flowchart` with diamond |
| Time-ordered messages between actors | sequence | `sequenceDiagram` |
| States + transitions + guards | state | `stateDiagram-v2` |
| Entities + fields + relationships | ER | `erDiagram` |
| Events positioned in time | timeline | `timeline` |
| Cross-functional handoffs | swimlane | `flowchart` with per-lane subgraph |
| Two-axis positioning (impact vs effort 등) | quadrant | `quadrantChart` |
| Hierarchy by containment / scope | nested | `flowchart` with nested subgraph |
| Parent → children relationships | tree | `flowchart TD` |
| Stacked abstraction levels | layer stack | `flowchart` with stacked subgraph |
| Overlap between sets | venn | **Mermaid 미지원** → SVG fallback |
| Ranked hierarchy / funnel / conversion | pyramid | **Mermaid 미지원** → Chart.js bar fallback |

## Fallback (Mermaid 미지원 타입)

- **venn**: inline SVG 3-circle overlap (max 3 circles)
- **pyramid**: Chart.js `type: 'bar'`, `indexAxis: 'y'`, 내림차순 정렬

## Rules of thumb

1. 3-column 테이블이 같은 정보를 동등 이상으로 전달하면 **테이블 선택**, 다이어그램 삭제
2. 두 타입을 합치고 싶으면 지배 축 하나만 남김. 하이브리드 금지
3. Complexity budget(density-rules.md) 초과 시 overview + detail 2 다이어그램으로 분리
4. 단순 리스트는 다이어그램화 금지 — bullet 유지
5. 대화 message 흐름은 sequence만 사용. flowchart로 대체 금지

## 매핑 우선순위 (section-analyzer용)

섹션 헤더와 본문 키워드에 따라:

- "아키텍처", "구성요소", "architecture", "components" → architecture
- "흐름", "단계", "flow", "steps" → flowchart
- "순서", "통신", "프로토콜", "sequence", "handshake" → sequence
- "상태", "전이", "state", "transition" → state
- "엔티티", "스키마", "entities", "schema", "data model" → ER
- "타임라인", "히스토리", "timeline", "history" → timeline
- "부서", "역할", "lanes", "responsibilities" → swimlane
- "우선순위", "매트릭스", "priority", "effort", "impact" → quadrant
- "계층", "담기", "hierarchy", "nested" → nested
- "트리", "부모-자식", "tree", "parent-child" → tree
- "레이어", "스택", "layers", "stack" → layer stack
- "집합", "overlap", "교집합" → venn
- "깔때기", "퍼널", "funnel", "conversion" → pyramid

## Skill hints

| Skill | Most likely patterns |
|---|---|
| `doc-visual` | 모든 타입 가능 — 원본 문서 주제에 따름 |
| `diff-visual` | architecture, tree (file map), pyramid (change classification), quadrant (hot spots) |
| `plugin-visual` | architecture (component map), sequence (invocation flow), tree |
| `context-health-visual` | quadrant (skill density vs trigger collisions), timeline |
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/references/design-system/diagram-type-selection.md
git commit -m "Add Layer 0 diagram-type-selection.md — 13 types with selection guide for section-analyzer"
```

---

### Task 3: Layer 0 — diagram-density-rules.md 작성

**Files:**
- Create: `plugins/vision-powers/references/design-system/diagram-density-rules.md`

- [ ] **Step 1: 파일 작성**:

```markdown
# Diagram Density Rules

한 다이어그램은 **가볍게**, 초과 시 여러 개로 쪼갠다. diagram-generator와 taste-gate.js가 이 파일의 상한을 **강제**한다.

## Complexity budget per type

| 항목 | Max | 위반 시 |
|---|---|---|
| 전체 노드 | 9 | overview + detail 2장 분리 |
| 전체 arrows / transitions | 12 | 그룹 추상화 후 서브다이어그램 |
| accent (focal) 개수 | **2** | focal 재선정 |
| sequence lifelines | 5 | 덜 중요한 actor 제거 |
| swimlane lanes | 5 | 병합 가능한 lane 합침 |
| quadrant items | 12 | top 12만 표시 |
| ER entities | 8 | 서브도메인별 분리 |
| nested levels | 6 | 플랫화 또는 서브다이어그램 |
| tree depth | 4 | 중간 레벨 단축 |
| layer stack | 6 | 두 스택으로 분리 |
| venn circles | 3 | 시각적 한계 |
| pyramid layers | 6 | 상단 6단계만 |

## Focal rule

- accent는 **1-2개에만** 적용
- 4개 이상 accent = focal을 결정하지 못한 상태 → 재설계
- accent가 전체 노드의 30% 초과 = 재설계

## Split rule

Complexity budget 초과 시:
1. Overview 다이어그램 1장 (max 5 노드, 핵심 관계만)
2. Detail 다이어그램 N장 (overview에 click link로 연결)

## 테이블 vs 다이어그램 결정

- 2-column 비교 → 테이블
- 3-column 테이블로 충분한 정보 → 테이블
- 노드 간 관계가 **핵심**일 때만 다이어그램

## Length cap

- HTML 리포트당 다이어그램 총 개수 최대 15
- 마크다운 리포트당 다이어그램 최대 10
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/references/design-system/diagram-density-rules.md
git commit -m "Add Layer 0 diagram-density-rules.md — complexity budget per type, focal rule, split rule"
```

---

### Task 4: Layer 0 — taste-gate.md 작성

**Files:**
- Create: `plugins/vision-powers/references/design-system/taste-gate.md`

- [ ] **Step 1: 파일 작성**:

```markdown
# Taste Gate — Pre-output Checklist

diagram-generator 출력물이 최종 리포트에 들어가기 **전** 반드시 통과해야 하는 체크리스트. `scripts/taste-gate.js`가 이 파일의 규칙을 JSON으로 변환해 실행.

## Type fit
- [ ] 타입이 섹션 의도에 맞나? (diagram-type-selection.md 재확인)
- [ ] 3-column 테이블로 같은 정보 전달 가능? → 그렇다면 **다이어그램 삭제**

## Remove test
- [ ] 노드 하나 지워도 독자가 이해 가능? → 그 노드 **불필요**
- [ ] 두 노드가 항상 붙어 다님? → **하나로 병합**
- [ ] arrow가 layout만으로 명백함? → arrow **삭제**
- [ ] label이 색/모양으로 이미 signal? → label **삭제**

## Signal
- [ ] accent (focal) ≤ 2?
- [ ] legend가 사용된 모든 타입 커버 + 쓸데없는 항목 없음?
- [ ] Complexity budget (density-rules.md) 준수?

## Technical (파서 안정성)
- [ ] arrow label에 opaque mask? (없으면 선이 label을 통과)
- [ ] `writing-mode: vertical` 없음?
- [ ] Mermaid classDef에 `rgba()` / `rgb()` 없음? (파서 붕괴)
- [ ] classDef에 `color:` 없음? (다크모드 파괴, CSS 오버라이드 사용)
- [ ] sequenceDiagram message에 `{}[]<>&` 없음?
- [ ] stateDiagram-v2에 `<br/>` 없음?

## Typography
- [ ] 사람 이름 / 노드 이름 = body sans (mono 금지)?
- [ ] 기술 콘텐츠 (포트, URL, 경로, 필드 타입) = mono?
- [ ] JetBrains Mono 없음?

## Automation

`scripts/taste-gate.js`는 위 체크리스트 중 **프로그램적으로 검증 가능한 항목**을 자동화:

- Mermaid syntax validation (rgba / color / 특수문자 탐지)
- accent 개수 카운트
- 노드/arrow 개수 카운트
- Complexity budget 위반 탐지

수동 판단 필요 항목(Remove test, Type fit)은 section-analyzer와 diagram-generator의 시스템 프롬프트에 포함시켜 간접 강제.

## 위반 시 동작

1. 자동 검증 실패 → diagram-generator 재호출 (해당 섹션만, max 2회)
2. 2회 재시도 후에도 실패 → 해당 섹션의 다이어그램 **제외**, warn 로그 + 리포트 생성은 계속
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/references/design-system/taste-gate.md
git commit -m "Add Layer 0 taste-gate.md — pre-output checklist, enforced by scripts/taste-gate.js"
```

---

### Task 5: mermaid-patterns.md 13 타입 syntax 보강

**Files:**
- Modify: `plugins/vision-powers/references/design-system/mermaid-patterns.md`

- [ ] **Step 1: 현재 파일 확인**

```bash
wc -l plugins/vision-powers/references/design-system/mermaid-patterns.md
```

- [ ] **Step 2: 파일 끝에 새 섹션 추가** — 기존 Diagram Authoring Rules 섹션 뒤에:

```markdown
## 13-Type Syntax Reference

각 타입별 최소 완성 예제. 프로덕션 다이어그램에서는 Layer 0 semantic-tokens.md의 `%%{init}%%` 블록을 **반드시** 앞에 둔다.

### architecture
~~~
flowchart TD
  subgraph Frontend
    UI[React UI]
  end
  subgraph Backend
    API[API Server]
    DB[(Postgres)]
  end
  UI --> API
  API --> DB
~~~

### sequence
~~~
sequenceDiagram
  participant U as User
  participant A as App
  participant D as DB
  U->>A: Login request
  A->>D: Query user
  D-->>A: User record
  A-->>U: Session token
~~~
(message에 `{}[]<>&` 사용 금지)

### state
~~~
stateDiagram-v2
  [*] --> Idle
  Idle --> Running: start
  Running --> Done: complete
  Running --> Failed: error
~~~
(label에 `<br/>` 금지)

### ER
~~~
erDiagram
  USER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  USER {
    string name
    string email
  }
~~~

### timeline
~~~
timeline
  title 2026 Roadmap
  Q1 : Foundation : Auth
  Q2 : API v2 : Migration
  Q3 : Mobile
~~~

### swimlane
~~~
flowchart LR
  subgraph Frontend
    A[Submit form]
  end
  subgraph Backend
    B[Validate]
    C[Write DB]
  end
  subgraph Ops
    D[Alert]
  end
  A --> B --> C --> D
~~~

### quadrant
~~~
quadrantChart
  title Priorities
  x-axis Low --> High Effort
  y-axis Low --> High Impact
  quadrant-1 Do Now
  quadrant-2 Schedule
  quadrant-3 Drop
  quadrant-4 Delegate
  Auth: [0.3, 0.8]
  Dashboard: [0.7, 0.4]
~~~

### nested
~~~
flowchart TD
  subgraph Organization
    subgraph Team_A
      A1[Member 1]
      A2[Member 2]
    end
    subgraph Team_B
      B1[Member 3]
    end
  end
~~~

### tree
~~~
flowchart TD
  Root --> ChildA
  Root --> ChildB
  ChildA --> LeafA1
  ChildA --> LeafA2
  ChildB --> LeafB1
~~~

### layer stack
~~~
flowchart TD
  subgraph L4 ["L4: Application"]
    App
  end
  subgraph L3 ["L3: Framework"]
    Framework
  end
  subgraph L2 ["L2: Runtime"]
    Runtime
  end
  subgraph L1 ["L1: OS"]
    OS
  end
~~~

### venn (fallback — inline SVG)

Mermaid 미지원. assemble-report.js가 3-circle overlap SVG 생성:

~~~html
<svg viewBox="0 0 300 200">
  <circle cx="110" cy="100" r="70" fill="#b5523a" opacity="0.3"/>
  <circle cx="190" cy="100" r="70" fill="#2563eb" opacity="0.3"/>
  <circle cx="150" cy="130" r="70" fill="#57534e" opacity="0.3"/>
</svg>
~~~

### pyramid / funnel (fallback — Chart.js)

Mermaid 미지원. Chart.js horizontal bar with descending values:

~~~js
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Visitors', 'Signups', 'Active', 'Paying'],
    datasets: [{ data: [10000, 1500, 600, 150], backgroundColor: '#b5523a' }]
  },
  options: { indexAxis: 'y', plugins: { legend: { display: false } } }
});
~~~
```

- [ ] **Step 3: Commit**

```bash
git add plugins/vision-powers/references/design-system/mermaid-patterns.md
git commit -m "Extend mermaid-patterns.md with 13-type syntax reference including venn/pyramid fallbacks"
```

---

### Task 6: 구 Layer 0 파일 삭제 + 참조 업데이트

**Files:**
- Delete: `plugins/vision-powers/references/design-system/color-palette.md`
- Delete: `plugins/vision-powers/references/design-system/font-system.md`
- Delete: `plugins/vision-powers/references/design-system/diagram-argumentation.md`
- Delete: `plugins/vision-powers/references/design-system/anti-slop-rules.md`

- [ ] **Step 1: 현재 참조 찾기**

```bash
grep -rn "color-palette.md\|font-system.md\|diagram-argumentation.md\|anti-slop-rules.md" plugins/vision-powers/ | grep -v "\.git"
```

- [ ] **Step 2: 각 참조 위치에서 치환**

- `color-palette.md` → `semantic-tokens.md`
- `font-system.md` → `semantic-tokens.md` (중복되면 한 줄로 병합)
- `diagram-argumentation.md` → `diagram-density-rules.md` + `taste-gate.md` (문맥 따라)
- `anti-slop-rules.md` → `taste-gate.md`

Edit 도구로 각 파일 수정.

- [ ] **Step 3: 파일 삭제**

```bash
rm plugins/vision-powers/references/design-system/color-palette.md
rm plugins/vision-powers/references/design-system/font-system.md
rm plugins/vision-powers/references/design-system/diagram-argumentation.md
rm plugins/vision-powers/references/design-system/anti-slop-rules.md
```

- [ ] **Step 4: 깨진 참조 재확인**

```bash
grep -rn "color-palette.md\|font-system.md\|diagram-argumentation.md\|anti-slop-rules.md" plugins/vision-powers/ | grep -v "\.git"
```

Expected: 0건.

- [ ] **Step 5: Commit**

```bash
git add -A plugins/vision-powers/
git commit -m "Remove legacy Layer 0 files (color-palette/font-system/diagram-argumentation/anti-slop-rules), redirect all refs to new Layer 0"
```

---

## Phase 2 — doc-visual 스크립트 (TDD)

### Task 7: scripts/parse-markdown.js (TDD)

**Files:**
- Create: `plugins/vision-powers/scripts/parse-markdown.js`
- Create: `plugins/vision-powers/scripts/parse-markdown.test.js`

**목적**: 마크다운 파일을 읽어 `sections[]` JSON 추출.

- [ ] **Step 1: Write failing test**

```javascript
// scripts/parse-markdown.test.js
const assert = require('node:assert');
const { test } = require('node:test');
const { parseMarkdown } = require('./parse-markdown');

test('extracts H1 and H2 sections', () => {
  const input = `# Title\n\nIntro para.\n\n## Section A\n\nContent A.\n\n## Section B\n\nContent B.`;
  const result = parseMarkdown(input);
  assert.strictEqual(result.sections.length, 3);
  assert.strictEqual(result.sections[0].heading, 'Title');
  assert.strictEqual(result.sections[0].level, 1);
  assert.strictEqual(result.sections[1].heading, 'Section A');
  assert.strictEqual(result.sections[1].level, 2);
});

test('preserves code blocks inside sections', () => {
  const input = '## Section\n\n```js\nconst x = 1;\n```';
  const result = parseMarkdown(input);
  assert.strictEqual(result.sections[0].code_blocks.length, 1);
  assert.strictEqual(result.sections[0].code_blocks[0].lang, 'js');
  assert.match(result.sections[0].code_blocks[0].content, /const x = 1/);
});

test('detects existing mermaid blocks', () => {
  const input = '## Section\n\n```mermaid\ngraph TD\n  A --> B\n```';
  const result = parseMarkdown(input);
  assert.strictEqual(result.sections[0].existing_mermaid.length, 1);
  assert.match(result.sections[0].existing_mermaid[0], /graph TD/);
});

test('detects tables in sections', () => {
  const input = '## Section\n\n| A | B |\n|---|---|\n| 1 | 2 |';
  const result = parseMarkdown(input);
  assert.strictEqual(result.sections[0].has_table, true);
});

test('handles empty document gracefully', () => {
  const result = parseMarkdown('');
  assert.strictEqual(result.sections.length, 0);
});

test('falls back to one section when no headings', () => {
  const input = 'Just some text without headings.';
  const result = parseMarkdown(input);
  assert.strictEqual(result.sections.length, 1);
  assert.strictEqual(result.sections[0].heading, null);
  assert.match(result.sections[0].body, /Just some text/);
});
```

- [ ] **Step 2: Verify test fails**

```bash
cd plugins/vision-powers/scripts && node --test parse-markdown.test.js
```

Expected: FAIL with "Cannot find module './parse-markdown'".

- [ ] **Step 3: Implement parse-markdown.js**

```javascript
// scripts/parse-markdown.js
'use strict';

/**
 * parseMarkdown — Extract structured sections from raw markdown.
 * Returns { sections: [{ id, heading, level, body, code_blocks, existing_mermaid, has_table, has_list }] }
 */
function parseMarkdown(src) {
  if (!src || src.trim() === '') return { sections: [] };

  const lines = src.split('\n');
  const sections = [];
  let current = null;
  let inCodeBlock = false;
  let currentCode = null;
  let codeLang = '';

  const headingRegex = /^(#{1,3})\s+(.+)$/;
  const codeFenceRegex = /^```(\w*)/;
  const tableRegex = /^\|.+\|.*$/;
  const listRegex = /^\s*[-*+]\s+/;

  let sectionCounter = 0;
  const newSection = (heading, level) => {
    sectionCounter += 1;
    return {
      id: `sec-${sectionCounter}`,
      heading,
      level,
      body: '',
      code_blocks: [],
      existing_mermaid: [],
      has_table: false,
      has_list: false,
    };
  };

  for (const line of lines) {
    const fenceMatch = line.match(codeFenceRegex);
    if (fenceMatch && !inCodeBlock) {
      inCodeBlock = true;
      codeLang = fenceMatch[1];
      currentCode = '';
      continue;
    }
    if (fenceMatch && inCodeBlock) {
      inCodeBlock = false;
      if (!current) current = newSection(null, 0);
      if (codeLang === 'mermaid') {
        current.existing_mermaid.push(currentCode);
      } else {
        current.code_blocks.push({ lang: codeLang, content: currentCode });
      }
      currentCode = null;
      codeLang = '';
      continue;
    }
    if (inCodeBlock) {
      currentCode += (currentCode ? '\n' : '') + line;
      continue;
    }

    const hMatch = line.match(headingRegex);
    if (hMatch) {
      if (current) sections.push(current);
      current = newSection(hMatch[2].trim(), hMatch[1].length);
      continue;
    }

    if (!current) current = newSection(null, 0);

    if (tableRegex.test(line)) current.has_table = true;
    if (listRegex.test(line)) current.has_list = true;

    current.body += (current.body ? '\n' : '') + line;
  }

  if (current) sections.push(current);

  return { sections };
}

module.exports = { parseMarkdown };
```

- [ ] **Step 4: Verify tests pass**

```bash
cd plugins/vision-powers/scripts && node --test parse-markdown.test.js
```

Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add plugins/vision-powers/scripts/parse-markdown.js plugins/vision-powers/scripts/parse-markdown.test.js
git commit -m "Add scripts/parse-markdown.js — extract sections/code/mermaid/tables from markdown (TDD, 6 tests)"
```

---

### Task 8: scripts/taste-gate.js (TDD)

**Files:**
- Create: `plugins/vision-powers/scripts/taste-gate.js`
- Create: `plugins/vision-powers/scripts/taste-gate.test.js`

**목적**: Mermaid 코드 블록을 받아 Layer 0 taste-gate.md 규칙 자동 검증.

- [ ] **Step 1: Write failing test**

```javascript
// scripts/taste-gate.test.js
const assert = require('node:assert');
const { test } = require('node:test');
const { runTasteGate } = require('./taste-gate');

test('passes clean mermaid flowchart', () => {
  const mermaid = 'flowchart TD\n  A --> B\n  B --> C';
  const result = runTasteGate({ mermaid, type: 'flowchart' });
  assert.strictEqual(result.violations.length, 0);
  assert.strictEqual(result.ok, true);
});

test('detects rgba in classDef', () => {
  const mermaid = 'flowchart TD\n  A --> B\n  classDef hl fill:rgba(181,82,58,0.2)';
  const result = runTasteGate({ mermaid, type: 'flowchart' });
  assert.ok(result.violations.some(v => v.rule === 'no-rgba-in-classdef'));
  assert.strictEqual(result.ok, false);
});

test('detects too many nodes', () => {
  let nodes = '';
  for (let i = 0; i < 12; i += 1) nodes += `  N${i}\n`;
  const mermaid = `flowchart TD\n${nodes}`;
  const result = runTasteGate({ mermaid, type: 'flowchart' });
  assert.ok(result.violations.some(v => v.rule === 'max-nodes-exceeded'));
});

test('detects br tag in stateDiagram', () => {
  const mermaid = 'stateDiagram-v2\n  A: Label<br/>Line2';
  const result = runTasteGate({ mermaid, type: 'state' });
  assert.ok(result.violations.some(v => v.rule === 'no-br-in-state'));
});

test('detects forbidden chars in sequenceDiagram message', () => {
  const mermaid = 'sequenceDiagram\n  A->>B: call({ foo: 1 })';
  const result = runTasteGate({ mermaid, type: 'sequence' });
  assert.ok(result.violations.some(v => v.rule === 'no-special-chars-in-sequence'));
});

test('detects color in classDef', () => {
  const mermaid = 'flowchart TD\n  A --> B\n  classDef x color:#fff,fill:#111';
  const result = runTasteGate({ mermaid, type: 'flowchart' });
  assert.ok(result.violations.some(v => v.rule === 'no-color-in-classdef'));
});
```

- [ ] **Step 2: Verify test fails**

```bash
cd plugins/vision-powers/scripts && node --test taste-gate.test.js
```

Expected: FAIL.

- [ ] **Step 3: Implement taste-gate.js**

```javascript
// scripts/taste-gate.js
'use strict';

const DENSITY_BUDGETS = {
  flowchart: { maxNodes: 9, maxArrows: 12 },
  architecture: { maxNodes: 9, maxArrows: 12 },
  sequence: { maxNodes: 5, maxArrows: 15 },
  state: { maxNodes: 9, maxArrows: 12 },
  ER: { maxNodes: 8, maxArrows: 12 },
  timeline: { maxNodes: 9, maxArrows: 0 },
  swimlane: { maxNodes: 9, maxArrows: 12 },
  quadrant: { maxNodes: 12, maxArrows: 0 },
  nested: { maxNodes: 9, maxArrows: 12 },
  tree: { maxNodes: 9, maxArrows: 12 },
  layer: { maxNodes: 6, maxArrows: 0 },
  venn: { maxNodes: 3, maxArrows: 0 },
  pyramid: { maxNodes: 6, maxArrows: 0 },
};

function runTasteGate({ mermaid, type }) {
  const violations = [];

  if (/classDef[^\n]*r?gba?\(/.test(mermaid)) {
    violations.push({ rule: 'no-rgba-in-classdef', hint: 'Use 8-digit hex #RRGGBBAA instead' });
  }

  if (/classDef[^\n]*\bcolor\s*:/.test(mermaid)) {
    violations.push({ rule: 'no-color-in-classdef', hint: 'Let CSS overrides handle text via var(--text)' });
  }

  if (type === 'state' && /<br\/?>/.test(mermaid)) {
    violations.push({ rule: 'no-br-in-state', hint: 'Use flowchart for multi-line state labels' });
  }

  if (type === 'sequence') {
    const messageLines = mermaid.split('\n').filter(l => /->>?/.test(l));
    for (const line of messageLines) {
      const afterColon = line.split(':').slice(1).join(':');
      if (/[{}\[\]<>&]/.test(afterColon)) {
        violations.push({ rule: 'no-special-chars-in-sequence', hint: 'Rewrite message as plain prose' });
        break;
      }
    }
  }

  const budget = DENSITY_BUDGETS[type] || DENSITY_BUDGETS.flowchart;
  const nodeIds = new Set();
  const nodeMatches = mermaid.matchAll(/^\s*([A-Za-z_]\w*)(?:\[|\{|\(|$|\s+-->|\s+\.->|\s+==>)/gm);
  for (const m of nodeMatches) {
    nodeIds.add(m[1]);
  }
  if (nodeIds.size > budget.maxNodes) {
    violations.push({
      rule: 'max-nodes-exceeded',
      hint: `${type} budget is ${budget.maxNodes}, got ${nodeIds.size} — split into overview + detail`,
    });
  }

  const accentMatches = (mermaid.match(/:::accent\b|class\s+\w+\s+accent/g) || []).length;
  if (accentMatches > 2) {
    violations.push({
      rule: 'too-many-accents',
      hint: `accent used on ${accentMatches} elements, max is 2`,
    });
  }

  return { ok: violations.length === 0, violations };
}

module.exports = { runTasteGate };
```

- [ ] **Step 4: Verify tests pass**

```bash
cd plugins/vision-powers/scripts && node --test taste-gate.test.js
```

Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add plugins/vision-powers/scripts/taste-gate.js plugins/vision-powers/scripts/taste-gate.test.js
git commit -m "Add scripts/taste-gate.js — enforces Layer 0 taste-gate rules (TDD, 6 tests)"
```

---

## Phase 3 — doc-visual agents / template / skill

### Task 9: agents/section-analyzer.md 작성

**Files:**
- Create: `plugins/vision-powers/agents/section-analyzer.md`

- [ ] **Step 1: 파일 작성**:

```markdown
---
name: section-analyzer
description: |
  doc-visual 파이프라인의 의미 판단 단계. parse-markdown.js가 추출한 sections[] JSON을 받아 각 섹션의 의도와 적합한 다이어그램 타입을 판단.
tools: Read
---

# section-analyzer

## Role

doc-visual의 2단계 — 마크다운 섹션을 읽고 각 섹션에 어떤 다이어그램을 넣을지 결정.

## Required context

호출 시 프롬프트에 포함:
1. `sections[]` JSON (parse-markdown.js 출력)
2. Layer 0 `diagram-type-selection.md` 전체
3. Layer 0 `diagram-density-rules.md` 요약

## Decision logic per section

1. **skip_diagram 판단**
   - 섹션 길이 < 100자 → skip
   - 단순 intro / conclusion → skip
   - table 하나만 있고 그걸로 충분 → skip

2. **type 판단**
   - diagram-type-selection.md 매핑 우선순위 표
   - 섹션 헤더 + 본문 첫 문단 키워드 매칭
   - 애매하면 가장 구조적 설명을 찾아 유추

3. **is_hero 판단**
   - 문서 전체에서 1-2개만
   - 보통 Executive Summary, Overview, Architecture 같은 상단 H2
   - 전체 개요를 그림 한 장으로 보여주는 역할

## Output format

각 섹션에 추가:
~~~json
{
  "section_id": "sec-1",
  "heading": "...",
  "diagram_plan": {
    "skip_diagram": false,
    "diagram_type": "architecture",
    "is_hero": true,
    "rationale": "이 섹션은 시스템 구성 요소와 연결을 설명 — architecture 적합"
  }
}
~~~

## Gotchas

- **타입 선정 시 다양성 유지** — 모든 섹션이 flowchart면 단조롭다
- **Hero는 과하게 지정 금지** — 3개 = 없음과 동일
- **skip_diagram을 두려워하지 말 것** — 단순 리스트 섹션은 다이어그램화 금지
- **rationale 필수** — 디버깅용
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/agents/section-analyzer.md
git commit -m "Add agents/section-analyzer.md — decide diagram type per section using Layer 0 selection guide"
```

---

### Task 10: agents/diagram-generator.md 작성

**Files:**
- Create: `plugins/vision-powers/agents/diagram-generator.md`

- [ ] **Step 1: 파일 작성**:

```markdown
---
name: diagram-generator
description: |
  doc-visual 파이프라인의 생성 단계. section-analyzer가 결정한 타입과 섹션 원문을 받아 Mermaid 코드와 3-5줄 요약을 생성.
tools: Read
---

# diagram-generator

## Role

doc-visual의 3단계 — 각 섹션에 3-5줄 요약과 Mermaid 코드 생성. Layer 0 토큰 + density rules + mermaid-patterns.md 준수.

## Required context

1. section-analyzer 출력 (`diagram_plan` 포함된 sections[])
2. 원본 섹션 body 텍스트
3. Layer 0 `semantic-tokens.md` (themeVariables 매핑 + 토큰 세트)
4. Layer 0 `diagram-density-rules.md`
5. Layer 0 `mermaid-patterns.md`의 해당 타입 섹션

## Per-section output

1. **summary** (3-5줄) — 원본 body 압축. 다이어그램을 **보충**하되 반복하지 않음
2. **mermaid_code** (skip_diagram이 false일 때만) — 첫 줄에 `%%{init}%%` 블록으로 토큰 주입

## Init block template

~~~
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '<accent>',
    'primaryBorderColor': '<ink>',
    'primaryTextColor': '<ink>',
    'lineColor': '<muted>',
    'secondaryColor': '<paper-2>',
    'fontFamily': '<body font>'
  }
}}%%
~~~

토큰 값은 runtime에 aesthetic-rotation.js 출력을 주입.

## Output format

~~~json
{
  "section_id": "sec-1",
  "summary": "본 섹션은 ...\n- 주요 흐름: A → B → C\n...",
  "mermaid_code": "%%{init:...}%%\nflowchart TD\n..."
}
~~~

## Gotchas

- **classDef에 rgba() / color: 금지** — taste-gate.js 거부. 8-digit hex (`#RRGGBBAA`) 사용
- **sequenceDiagram message에 `{}[]<>&` 금지** — 파서 깨짐
- **stateDiagram-v2 label에 `<br/>` 금지** — 복잡 label은 flowchart로
- **node ID에 하이픈 금지** — Mermaid가 subtraction으로 해석. underscore 사용
- **accent는 1-2 노드만**
- **원본 코드블록은 summary에 언급만** — 다이어그램에 복붙 금지
- **노드 label은 20자 이하** — 긴 label은 줄임말

## 재시도 로직

taste-gate.js 위반 리턴 시 호출자가 재호출. 재호출 시:
- violations 배열을 프롬프트에 추가
- 특정 위반만 수정 (처음부터 다시 쓰지 말고)
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/agents/diagram-generator.md
git commit -m "Add agents/diagram-generator.md — generate Mermaid + 3-5 line summary per section"
```

---

### Task 11: templates/doc-visual.html 작성

**Files:**
- Create: `plugins/vision-powers/templates/doc-visual.html`

- [ ] **Step 1: 기존 diff-visual.html 구조 확인**

```bash
wc -l plugins/vision-powers/templates/diff-visual.html
head -80 plugins/vision-powers/templates/diff-visual.html
```

- [ ] **Step 2: doc-visual.html 작성** (기본 스켈레톤):

```html
<!DOCTYPE html>
<html lang="{LANG}" data-color-scheme="{COLOR_SCHEME}">
<head>
  <meta charset="UTF-8">
  <title>{DOC_TITLE}</title>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --paper: {TOKEN_PAPER};
      --paper-2: {TOKEN_PAPER_2};
      --ink: {TOKEN_INK};
      --muted: {TOKEN_MUTED};
      --accent: {TOKEN_ACCENT};
      --link: {TOKEN_LINK};
      --rule: {TOKEN_RULE};
    }
    body { background: var(--paper); color: var(--ink); font-family: 'Geist', sans-serif; }
    h1 { font-family: 'Instrument Serif', serif; font-weight: 400; }
    .eyebrow { font-family: 'Geist Mono', monospace; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
    .doc-section { margin: 2rem 0; padding: 1.5rem; border-top: 1px solid var(--rule); }
    .doc-section[data-is-hero="true"] { background: var(--paper-2); border-left: 2px solid var(--accent); }
    .summary { color: var(--ink); line-height: 1.6; }
    .mermaid-wrap { position: relative; background: var(--paper-2); border: 1px solid var(--rule); border-radius: 8px; padding: 1rem; margin-top: 1rem; }
    /* zoom-controls + feedback bar patterns loaded from shared.js */
  </style>
</head>
<body>
  <header>
    <p class="eyebrow">DOC VISUAL</p>
    <h1>{DOC_TITLE}</h1>
    <p class="source-link">원본: <a href="{SOURCE_PATH}">{SOURCE_PATH}</a></p>
  </header>

  <nav class="toc">
    {TOC_HTML}
  </nav>

  <main>
    {SECTIONS_HTML}
  </main>

  <footer class="colophon">
    <p>Generated by vision-powers doc-visual · {TIMESTAMP}</p>
  </footer>

  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      look: 'classic',
      securityLevel: 'loose',
      themeVariables: {
        primaryColor: '{TOKEN_ACCENT}',
        primaryBorderColor: '{TOKEN_INK}',
        primaryTextColor: '{TOKEN_INK}',
        lineColor: '{TOKEN_MUTED}',
        secondaryColor: '{TOKEN_PAPER_2}',
        fontFamily: 'Geist, sans-serif',
        fontSize: '16px'
      }
    });
  </script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  {SHARED_JS}
</body>
</html>
```

각 `{...}` placeholder는 assemble-report.js가 런타임에 치환.

- [ ] **Step 3: Commit**

```bash
git add plugins/vision-powers/templates/doc-visual.html
git commit -m "Add templates/doc-visual.html — dynamic section layout, Layer 0 tokens via CSS custom properties"
```

---

### Task 12: scripts/assemble-report.js 확장 (doc-visual 지원)

**Files:**
- Modify: `plugins/vision-powers/scripts/assemble-report.js`
- Modify: `plugins/vision-powers/references/report-generation-workflow.md`

- [ ] **Step 1: assemble-report.js 읽기**

```bash
wc -l plugins/vision-powers/scripts/assemble-report.js
head -80 plugins/vision-powers/scripts/assemble-report.js
```

- [ ] **Step 2: doc-visual 분기 추가**

`skill-prefix` 분기 로직에 `doc-visual` 케이스 추가:
- template: `templates/doc-visual.html`
- sections 데이터를 `{TOC_HTML}` 및 `{SECTIONS_HTML}`으로 렌더링
- 각 섹션: `<section id="..." class="doc-section" data-is-hero="..."><h{level}>...</h{level}><p class="summary">...</p><div class="mermaid-wrap"><pre class="mermaid">...</pre></div></section>`
- `skip_diagram: true` 섹션은 `.mermaid-wrap` 생략

Markdown 모드 분기 (`--format md`): 섹션별 조립 —

~~~
## {heading}

{summary}

```mermaid
{mermaid_code}
```
~~~

마지막에 `\n\n---\n원본: <path>\n` 푸터.

- [ ] **Step 3: report-generation-workflow.md에 doc-visual 섹션 추가**

파이프라인 문서화: `parse-markdown → section-analyzer → diagram-generator → taste-gate → assemble-report`. 각 단계 입출력 JSON 스키마 명시.

- [ ] **Step 4: 스모크 테스트**

간단한 sections[] 스텁으로 HTML/MD 출력 생성 확인.

- [ ] **Step 5: Commit**

```bash
git add plugins/vision-powers/scripts/assemble-report.js plugins/vision-powers/references/report-generation-workflow.md
git commit -m "Extend assemble-report.js for doc-visual (HTML and markdown), document pipeline in workflow ref"
```

---

### Task 13: skills/doc-visual/SKILL.md 작성

**Files:**
- Create: `plugins/vision-powers/skills/doc-visual/SKILL.md`

- [ ] **Step 1: 파일 작성**:

```markdown
---
name: doc-visual
description: |
  임의 마크다운 문서(research/spec/RFC/ADR/design)를 다이어그램 강화된 리포트로 변환.
  Use when asked to visualize, explain, or make a document easier to understand —
  "이 문서 다이어그램으로 깨줘", "visualize this research", "make this design doc easier to read",
  "summarize this spec with diagrams". 단일 md 파일 입력.
argument-hint: "<md-file-path> [--format html|md] [--lang <code>]"
allowed-tools: Read, Glob, Grep, Agent, Bash(node *), Bash(open *), Bash(rm -rf /tmp/doc-visual-*)
---

# doc-visual

마크다운 문서를 읽고 각 섹션의 의미에 맞는 다이어그램(13 타입 중)을 자동으로 끼워 넣은 HTML 또는 마크다운 리포트를 생성.

## Instructions

### Format Detection

| Flag | Values | Default |
|---|---|---|
| `--format` | `html` / `md` | `html` |
| `--lang` | ISO code | 문서 자동 감지 |

### Input Parsing

인자 = 단일 마크다운 파일 경로. 디렉터리/URL/stdin은 미지원.

- 파일 존재 + 마크다운 확장자 검증 (`.md`, `.markdown`, `.txt`)
- 파일 없음/권한 없음 → 즉시 중단

### Pipeline

~~~
[1] parse-markdown.js       → sections[] JSON
[2] section-analyzer (agent)→ sections[]에 diagram_plan 추가
[3] diagram-generator (agent)→ summary + mermaid_code
[4] taste-gate.js           → Layer 0 위반 검출, 위반 시 [3] 재호출 (max 2회)
[5] assemble-report.js      → HTML 또는 MD 조립
~~~

### Step 1 — Parse markdown

```bash
node ../../scripts/parse-markdown.js <input-md-path>
```

폴백: 빈 파일 → 중단. H1/H2 없음 → 섹션 1개로 처리.

### Step 2 — Section analyzer (subagent)

Agent 도구로 `section-analyzer` 호출. 프롬프트에 inline:
- `sections[]` JSON
- `references/design-system/diagram-type-selection.md` 내용
- `references/design-system/diagram-density-rules.md` 요약

출력: `diagram_plan` 추가.

### Step 3 — Diagram generator (subagent)

섹션별 병렬 호출 가능. Agent 도구로 `diagram-generator` 호출. 프롬프트에:
- 해당 section
- `references/design-system/semantic-tokens.md` (현재 aesthetic 세트 값)
- `references/design-system/mermaid-patterns.md`의 해당 타입 섹션
- `references/design-system/diagram-density-rules.md`

출력: `summary` + `mermaid_code`.

### Step 4 — Taste gate

```bash
node ../../scripts/taste-gate.js --mermaid <code> --type <type>
```

위반 시 해당 섹션만 Step 3 재호출 (violations 프롬프트에 추가). 최대 2회 재시도 후에도 위반 → 해당 섹션 다이어그램 제외, warn 로그.

### Step 5 — Assemble

```bash
node ../../scripts/assemble-report.js \
  --skill-prefix doc-visual \
  --format <html|md> \
  --sections <json-file> \
  --output <output-path>
```

### Output

- HTML: `${CLAUDE_PLUGIN_DATA}/reports/{doc-basename}-doc-visual.html`. 완료 후 `open` 명령어.
- MD: 응답 본문 직접 삽입. 푸터에 원본 경로 링크.

### Error Handling

| 실패 | 동작 |
|---|---|
| 입력 없음/권한 없음 | 즉시 중단 |
| parse-markdown: 깨진 md | H1 1개로 폴백, 경고 |
| section-analyzer 실패 | 모든 섹션 skip_diagram: true, 요약만 |
| diagram-generator 실패 | 해당 섹션 skip, 요약만 |
| taste-gate 2회 후 위반 | 해당 섹션 다이어그램 제외 |
| assemble 실패 | 에러 전달, 부분 산출물 보존 |

### Gotchas

- **긴 문서(>10000자)** → 섹션 요약 강제
- **짧은 문서(<500자)** → 1섹션 + hero 1개만
- **기존 Mermaid 블록** → Layer 0 토큰으로 업그레이드 후 보존
- **refine 후속** → `report-manager refine`이 특정 섹션만 재생성 (Step 3-4만)
- **venn/pyramid 요청** → fallback SVG/Chart.js로 assemble-report.js가 렌더

### Reference Files

- `../../references/design-system/semantic-tokens.md`
- `../../references/design-system/diagram-type-selection.md`
- `../../references/design-system/diagram-density-rules.md`
- `../../references/design-system/taste-gate.md`
- `../../references/design-system/mermaid-patterns.md`
- `../../references/report-generation-workflow.md`
- `references/section-structure.md`
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/skills/doc-visual/SKILL.md
git commit -m "Add skills/doc-visual/SKILL.md — hybrid pipeline (parse -> analyze -> generate -> gate -> assemble)"
```

---

### Task 14: skills/doc-visual/references/section-structure.md

**Files:**
- Create: `plugins/vision-powers/skills/doc-visual/references/section-structure.md`

- [ ] **Step 1: 파일 작성**:

```markdown
# Section Structure — doc-visual

assemble-report.js가 HTML 출력 시 따르는 섹션 렌더링 패턴.

## HTML per section

~~~html
<section id="{section_id}" class="doc-section depth-{level}" data-is-hero="{is_hero}">
  <h{level}>{heading}</h{level}>
  <p class="summary">{summary}</p>
  <div class="mermaid-wrap">
    <div class="zoom-controls">
      <button onclick="zoomDiagram(this, 1.3)">+</button>
      <button onclick="zoomDiagram(this, 1/1.3)">−</button>
      <button onclick="resetZoom(this)">↻</button>
      <span class="zoom-level">140%</span>
      <button onclick="toggleFullscreen(this)">⛶</button>
    </div>
    <pre class="mermaid">{mermaid_code}</pre>
  </div>
</section>
~~~

`skip_diagram: true` → `.mermaid-wrap` 생략.
`is_hero: true` → CSS `.doc-section[data-is-hero="true"]`로 시각 강조.

## TOC

문서 시작에 자동 생성:

~~~html
<nav class="toc">
  <p class="eyebrow">CONTENTS</p>
  <ol>
    <li><a href="#{section_id}">{heading}</a></li>
  </ol>
</nav>
~~~

## Hero styling

`.doc-section[data-is-hero="true"]`:
- 배경 `--paper-2`
- 2px `--accent` 왼쪽 보더
- 다이어그램 크기 1.2x
- 섹션 간격 위 아래 2배

## Markdown per section

~~~
## {heading}

{summary}

```mermaid
{mermaid_code}
```
~~~

`skip_diagram: true` → mermaid 블록 생략.

마지막 섹션 뒤:
~~~
---

**원본**: [{source_path}]({source_path})
**생성**: vision-powers doc-visual · {timestamp}
~~~
```

- [ ] **Step 2: Commit**

```bash
git add plugins/vision-powers/skills/doc-visual/references/section-structure.md
git commit -m "Add doc-visual section-structure.md — HTML and markdown section templates"
```

---

## Phase 4 — aesthetic-rotation 재정의

### Task 15: scripts/aesthetic-rotation.js 토큰 세트 기반

**Files:**
- Modify: `plugins/vision-powers/scripts/aesthetic-rotation.js`

- [ ] **Step 1: 현재 파일 읽기**

```bash
cat plugins/vision-powers/scripts/aesthetic-rotation.js
```

- [ ] **Step 2: 재작성**

```javascript
// scripts/aesthetic-rotation.js
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const TOKEN_SETS = [
  {
    id: 'warm-stone',
    scheme: 'light',
    tokens: {
      paper: '#faf7f2',
      'paper-2': '#f2ede4',
      ink: '#1c1917',
      muted: '#57534e',
      soft: '#78716c',
      rule: 'rgba(28,25,23,0.12)',
      accent: '#b5523a',
      'accent-tint': 'rgba(181,82,58,0.08)',
      link: '#2563eb',
    },
    fonts: {
      title: "'Instrument Serif', serif",
      body: "'Geist', sans-serif",
      mono: "'Geist Mono', monospace",
    },
  },
  {
    id: 'cool-slate',
    scheme: 'light',
    tokens: {
      paper: '#f1f5f9',
      'paper-2': '#e2e8f0',
      ink: '#0f172a',
      muted: '#475569',
      soft: '#64748b',
      rule: 'rgba(15,23,42,0.12)',
      accent: '#0369a1',
      'accent-tint': 'rgba(3,105,161,0.10)',
      link: '#2563eb',
    },
    fonts: {
      title: "'Instrument Serif', serif",
      body: "'Geist', sans-serif",
      mono: "'Geist Mono', monospace",
    },
  },
  {
    id: 'editorial-ink',
    scheme: 'light',
    tokens: {
      paper: '#fafaf9',
      'paper-2': '#f5f5f4',
      ink: '#18181b',
      muted: '#52525b',
      soft: '#71717a',
      rule: 'rgba(24,24,27,0.12)',
      accent: '#7c2d12',
      'accent-tint': 'rgba(124,45,18,0.10)',
      link: '#1d4ed8',
    },
    fonts: {
      title: "'Instrument Serif', serif",
      body: "'Geist', sans-serif",
      mono: "'Geist Mono', monospace",
    },
  },
  {
    id: 'blueprint',
    scheme: 'light',
    tokens: {
      paper: '#eff6ff',
      'paper-2': '#dbeafe',
      ink: '#1e3a8a',
      muted: '#3730a3',
      soft: '#4338ca',
      rule: 'rgba(30,58,138,0.12)',
      accent: '#dc2626',
      'accent-tint': 'rgba(220,38,38,0.10)',
      link: '#1d4ed8',
    },
    fonts: {
      title: "'Instrument Serif', serif",
      body: "'Geist', sans-serif",
      mono: "'Geist Mono', monospace",
    },
  },
  {
    id: 'warm-stone-dark',
    scheme: 'dark',
    tokens: {
      paper: '#1c1917',
      'paper-2': '#292524',
      ink: '#faf7f2',
      muted: '#a8a29e',
      soft: '#78716c',
      rule: 'rgba(250,247,242,0.12)',
      accent: '#d6724a',
      'accent-tint': 'rgba(214,114,74,0.10)',
      link: '#60a5fa',
    },
    fonts: {
      title: "'Instrument Serif', serif",
      body: "'Geist', sans-serif",
      mono: "'Geist Mono', monospace",
    },
  },
  {
    id: 'cool-slate-dark',
    scheme: 'dark',
    tokens: {
      paper: '#0f172a',
      'paper-2': '#1e293b',
      ink: '#f1f5f9',
      muted: '#94a3b8',
      soft: '#64748b',
      rule: 'rgba(241,245,249,0.12)',
      accent: '#38bdf8',
      'accent-tint': 'rgba(56,189,248,0.10)',
      link: '#60a5fa',
    },
    fonts: {
      title: "'Instrument Serif', serif",
      body: "'Geist', sans-serif",
      mono: "'Geist Mono', monospace",
    },
  },
];

function historyPath() {
  const base = process.env.CLAUDE_PLUGIN_DATA || path.join(process.env.HOME, '.vision-powers-data');
  return path.join(base, 'aesthetic-history.json');
}

function loadHistory() {
  try {
    return JSON.parse(fs.readFileSync(historyPath(), 'utf8'));
  } catch {
    return { last_n: [] };
  }
}

function saveHistory(history) {
  fs.mkdirSync(path.dirname(historyPath()), { recursive: true });
  fs.writeFileSync(historyPath(), JSON.stringify(history, null, 2));
}

/**
 * pickNextTokenSet — 직전 3개와 겹치지 않도록 다음 토큰 세트 선택
 */
function pickNextTokenSet({ preferScheme } = {}) {
  const history = loadHistory();
  const pool = TOKEN_SETS.filter(s => !preferScheme || s.scheme === preferScheme);
  const recent = new Set(history.last_n.slice(-3));
  const fresh = pool.filter(s => !recent.has(s.id));
  const chosen = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))];
  history.last_n.push(chosen.id);
  if (history.last_n.length > 10) history.last_n = history.last_n.slice(-10);
  saveHistory(history);
  return chosen;
}

module.exports = { TOKEN_SETS, pickNextTokenSet };
```

- [ ] **Step 3: 기존 호출자 업데이트**

```bash
grep -rn "aesthetic-rotation" plugins/vision-powers/ | grep -v "\.git"
```

각 호출자의 API를 새 `pickNextTokenSet()` 시그니처에 맞게 조정.

- [ ] **Step 4: 스모크 테스트**

```bash
node -e "console.log(require('./plugins/vision-powers/scripts/aesthetic-rotation').pickNextTokenSet())"
```

Expected: 토큰 세트 객체 하나 출력.

- [ ] **Step 5: Commit**

```bash
git add plugins/vision-powers/scripts/aesthetic-rotation.js
git commit -m "Rewrite aesthetic-rotation.js — 6 predefined token sets, history-aware rotation avoiding last 3"
```

---

## Phase 5 — diff-visual 다이어트

### Task 16: diff-visual SKILL.md + section-structure.md 다이어트

**Files:**
- Modify: `plugins/vision-powers/skills/diff-visual/SKILL.md`
- Modify: `plugins/vision-powers/skills/diff-visual/references/section-structure.md`

- [ ] **Step 1: SKILL.md 다이어트**

다음 섹션 **제거**:
- Intent Check 중 Code Review / Decision Rationale 요청
- Data Gathering Step 3의 Decision rationale, Test coverage, Housekeeping check
- Markdown mode 템플릿의 Code Review, Decisions & Rationale, Risks & Gaps 섹션

유지:
- Format Detection, Scope Detection, Language Detection, Input Parsing
- Data Gathering Step 1 (stats), Step 2 (metrics), Step 3의 Architecture/Feature/API 분석
- Verification Checkpoint
- HTML / Markdown 모드

Markdown 모드 템플릿 교체 — 7섹션 구조:

~~~
# Diff Visual: <scope description>

**Scope:** `<git ref or range>` · **Audience:** <audience> · **Focus:** <focus>

## Overview
- Commits, Files changed, Lines +A / −B

## File Map
<tree/nested diagram of changed files grouped by directory>

## Architecture Impact
<1-2 paragraphs + architecture diagram>

## Change Classification
| Category | % | Files |
|---|---|---|

## Dependency Shift
<before/after side-by-side subgraph Mermaid>

## New Components
<architecture diagram focused on new modules>

## Hot Spots
<quadrant: impact vs frequency>
~~~

- [ ] **Step 2: references/section-structure.md 재작성**

9섹션 → 7섹션. 각 섹션에 Mermaid 타입 명시:
- Overview: stat cards + Chart.js donut
- File Map: Mermaid tree/nested
- Architecture Impact: Mermaid architecture
- Change Classification: Chart.js pyramid
- Dependency Shift: Mermaid side-by-side subgraph
- New Components: Mermaid architecture
- Hot Spots: Mermaid quadrantChart

Layer 0 참조 강제: 모든 Mermaid 블록 앞에 `%%{init}%%` 필수.

- [ ] **Step 3: Commit**

```bash
git add plugins/vision-powers/skills/diff-visual/SKILL.md plugins/vision-powers/skills/diff-visual/references/section-structure.md
git commit -m "Diet diff-visual: 10 sections to 7 (remove review/decisions/risks/tests/timeline, add hot-spots + dep-shift)"
```

---

### Task 17: templates/diff-visual.html 섹션 DOM 갱신

**Files:**
- Modify: `plugins/vision-powers/templates/diff-visual.html`

- [ ] **Step 1: 현재 섹션 확인**

```bash
grep -n 'id="' plugins/vision-powers/templates/diff-visual.html
```

- [ ] **Step 2: 섹션 교체**

제거:
- `<section id="code-review">`, `id="decisions">`, `id="risks-gaps">`, `id="test-coverage">`, `id="timeline">`

추가:
- `<section id="file-map">` — mermaid-wrap tree
- `<section id="hot-spots">` — mermaid-wrap quadrant
- `<section id="dependency-shift">` — mermaid-wrap side-by-side

유지: `overview`, `architecture-impact`, `change-classification`, `new-components`.

- [ ] **Step 3: Layer 0 CSS custom properties 적용**

`:root`에 semantic-tokens.md의 CSS 변수 주입. doc-visual.html과 동일 패턴.

- [ ] **Step 4: 로컬 렌더 확인**

```bash
claude --plugin-dir ./plugins/vision-powers
# 다른 터미널: visualize diff HEAD 실행
```

생성된 HTML에서 섹션 7개 / Mermaid 정상 / 레거시 섹션 미출현 확인.

- [ ] **Step 5: Commit**

```bash
git add plugins/vision-powers/templates/diff-visual.html
git commit -m "Update diff-visual.html — 7 sections (file-map/hot-spots/dep-shift added, review/decisions/risks/tests/timeline removed)"
```

---

## Phase 6 — 기존 스킬 Layer 0 적용

### Task 18: plugin-visual / context-health-visual Layer 0 참조

**Files:**
- Modify: `plugins/vision-powers/skills/plugin-visual/SKILL.md`
- Modify: `plugins/vision-powers/skills/context-health-visual/SKILL.md`

- [ ] **Step 1: plugin-visual SKILL.md — Reference Files에 Layer 0 추가**

기존 "Reference Files" 블록에 추가:
```
- `../../references/design-system/semantic-tokens.md` — 색/폰트 단일 소스 (**필수**)
- `../../references/design-system/diagram-type-selection.md` — 13타입 selection guide
- `../../references/design-system/diagram-density-rules.md` — complexity budget
- `../../references/design-system/taste-gate.md` — pre-output 체크리스트
```

본문 `Report Generation` 섹션에 추가:
> "다이어그램 생성 시 Layer 0의 semantic-tokens.md / diagram-type-selection.md / diagram-density-rules.md / taste-gate.md를 강제 로드. 생성된 Mermaid는 `scripts/taste-gate.js`로 검증."

- [ ] **Step 2: context-health-visual SKILL.md — 동일 패턴**

Layer 0 4개 파일 참조 + 강제 로드 문구 추가.

- [ ] **Step 3: 로컬 테스트**

```bash
claude --plugin-dir ./plugins/vision-powers
# analyze ./plugins/vision-powers
# diagnose environment
```

생성된 HTML에서 Mermaid가 새 Layer 0 토큰으로 렌더되는지 확인.

- [ ] **Step 4: Commit**

```bash
git add plugins/vision-powers/skills/plugin-visual/SKILL.md plugins/vision-powers/skills/context-health-visual/SKILL.md
git commit -m "Apply Layer 0 refs to plugin-visual and context-health-visual — enforce semantic tokens, density rules, taste gate"
```

---

## Phase 7 — 삭제 & 메타데이터 & 릴리즈

### Task 19: plan-visual / project-recap-visual 삭제

**Files:**
- Delete: `plugins/vision-powers/skills/plan-visual/`
- Delete: `plugins/vision-powers/skills/project-recap-visual/`
- Delete: `plugins/vision-powers/templates/plan-visual.html`
- Delete: `plugins/vision-powers/templates/project-recap.html`

- [ ] **Step 1: 관련 참조 확인**

```bash
grep -rn "plan-visual\|project-recap" plugins/vision-powers/ | grep -v "\.git" | grep -v "plan-visual/\|project-recap-visual/\|plan-visual.html\|project-recap.html"
```

돌아온 위치에서 참조 제거 (README.md / marketplace.json은 Task 20-21에서 처리).

- [ ] **Step 2: 삭제 실행**

```bash
rm -rf plugins/vision-powers/skills/plan-visual
rm -rf plugins/vision-powers/skills/project-recap-visual
rm plugins/vision-powers/templates/plan-visual.html
rm plugins/vision-powers/templates/project-recap.html
```

- [ ] **Step 3: Commit**

```bash
git add -A plugins/vision-powers/
git commit -m "Remove plan-visual and project-recap-visual skills (users do not use the review/recap functionality; visualization moves to doc-visual)"
```

---

### Task 20: plugin.json / marketplace.json 갱신 (v2.0.0)

**Files:**
- Modify: `plugins/vision-powers/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: plugin.json 수정** — description 필드:

```json
{
  "name": "vision-powers",
  "description": "Analyze Claude Code plugins and visualize text artifacts (markdown docs, git diffs, plugins) as interactive HTML or diagram-enhanced markdown reports. Skills: doc-visual, diff-visual, plugin-visual, context-health-visual, fact-check, report-manager."
}
```

(`version`은 plugin.json에 있으면 삭제 — marketplace.json이 source of truth. 없으면 유지.)

- [ ] **Step 2: marketplace.json 수정**

루트 `.claude-plugin/marketplace.json`의 vision-powers 항목:
- `version`: `"2.0.0"`
- `description`: plugin.json과 동일

- [ ] **Step 3: Commit**

```bash
git add plugins/vision-powers/.claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "Bump vision-powers to 2.0.0 (major) — doc-visual added, plan-visual and project-recap-visual removed"
```

---

### Task 21: README.md + CHANGELOG.md 갱신

**Files:**
- Modify: `plugins/vision-powers/README.md`
- Create: `plugins/vision-powers/CHANGELOG.md`

- [ ] **Step 1: README.md 스킬 목록 테이블 갱신**

- `plan-visual` 행 제거
- `project-recap-visual` 행 제거
- `doc-visual` 행 추가:

```markdown
| `doc-visual` | 임의 마크다운(research/spec/RFC/ADR/design)을 섹션별 요약 + 적합한 다이어그램 타입으로 재구성한 HTML/마크다운 리포트로 변환 |
```

`diff-visual` 설명 업데이트 — review/decision/risk 언급 제거, file-map/architecture/hot-spots/dep-shift 추가.

Agents 블록에 `section-analyzer`, `diagram-generator` 추가.

Usage 블록에 doc-visual 예시 추가:
```
doc-visual ./docs/research/xxx.md           # HTML 리포트
doc-visual ./docs/spec.md --format md       # 인라인 마크다운
```

- [ ] **Step 2: CHANGELOG.md 생성**

```markdown
# Changelog

## 2.0.0 — 2026-04-19

### Breaking changes

- **Removed**: `plan-visual` skill. 리뷰/검증 기능 제거. 문서 시각화는 `doc-visual`로 이전.
- **Removed**: `project-recap-visual` skill. 사용 패턴이 낮아 제거.
- **Changed**: `diff-visual` 섹션 구조 — 10섹션 → 7섹션. 제거: Code Review, Decisions, Risks, Test Coverage, Timeline. 추가: Hot Spots (quadrant), Dependency Shift (side-by-side).

### Added

- **New skill**: `doc-visual` — 임의 마크다운 문서를 다이어그램 강화 리포트로 변환. 13개 Mermaid 타입 중 섹션 의도에 맞게 자동 선택.
- **Layer 0 공통 기반**:
  - `references/design-system/semantic-tokens.md`
  - `references/design-system/diagram-type-selection.md`
  - `references/design-system/diagram-density-rules.md`
  - `references/design-system/taste-gate.md`
- **New agents**: `section-analyzer`, `diagram-generator`
- **New scripts**: `parse-markdown.js`, `taste-gate.js` (TDD)

### Changed

- `aesthetic-rotation.js` — 임의 팔레트 추첨 → 사전 정의된 6개 토큰 세트 중 last-3 회피 로테이션
- `mermaid-patterns.md` — 13 타입 syntax 예제 보강
- `plugin-visual`, `context-health-visual` — Layer 0 강제 로드

### Removed

- `references/design-system/color-palette.md` (semantic-tokens.md에 흡수)
- `references/design-system/font-system.md` (semantic-tokens.md에 흡수)
- `references/design-system/diagram-argumentation.md` (density-rules + taste-gate로 분산)
- `references/design-system/anti-slop-rules.md` (taste-gate에 통합)

### Tested against

- Claude Code v2.1.112
```

- [ ] **Step 3: Commit**

```bash
git add plugins/vision-powers/README.md plugins/vision-powers/CHANGELOG.md
git commit -m "Update README for v2.0, add CHANGELOG documenting breaking changes and additions"
```

---

### Task 22: 최종 검증 + 릴리즈 준비

**Files:** None (검증만)

- [ ] **Step 1: plugin validate**

```bash
cd plugins/vision-powers && unset CLAUDECODE && claude plugin validate .
```

Expected: validation passes.

- [ ] **Step 2: 로컬 스모크 테스트**

```bash
claude --plugin-dir ./plugins/vision-powers
```

다른 터미널에서:
- `doc-visual docs/superpowers/specs/2026-04-19-vision-powers-v2-design.md`
- `visualize diff HEAD`
- `analyze ./plugins/vision-powers`
- `diagnose environment`

각 스킬이 에러 없이 HTML 생성하는지.

- [ ] **Step 3: 시각 검증**

브라우저에서 생성된 HTML 4개 열어 확인:
- Mermaid 다이어그램 렌더 OK?
- 시맨틱 토큰 적용? (색이 정의된 토큰 세트 중 하나)
- 다이어그램 수가 density rules 이내?

- [ ] **Step 4: git 상태 확인**

```bash
git log develop --oneline -30
git fetch origin
git tag --sort=-v:refname | head -5
git log develop..main --oneline
```

`develop..main`이 비어야 함. 있으면 main → develop 머지 먼저.

- [ ] **Step 5: 사용자 리뷰 체크포인트**

여기서 보고: "모든 Task 완료. v2.0.0 태그 준비됨. develop → main 머지 + tag 진행할지 확인 필요."

**사용자 승인 없이 main 머지 / push 금지** (CLAUDE.md §Git Workflow).

- [ ] **Step 6 (사용자 승인 후): main 머지 + 태그**

```bash
git checkout main
git merge --no-ff develop -m "Release vision-powers v2.0.0 — doc-visual + Layer 0 + diff-visual diet"
git tag -a v2.0.0 -m "vision-powers v2.0.0 — major redesign: doc-visual new, plan/recap removed, Layer 0 shared foundation"
git checkout develop
```

Push는 사용자가 명시적으로 요청할 때만.

---

## Plan Self-review Checklist

- [ ] 모든 Task에 "Files" 블록 (Create/Modify/Delete 구분)
- [ ] 모든 Step이 actionable (2-5 min)
- [ ] 각 Task 끝에 Commit step
- [ ] Layer 0 4개 파일 내용이 스펙 §3과 일치
- [ ] doc-visual 파이프라인이 스펙 §4.3과 일치
- [ ] diff-visual 다이어트가 스펙 §5.1과 일치
- [ ] 삭제 대상이 스펙 §7과 일치
- [ ] CLAUDE.md 룰 준수: 영어 deliverables, 한국어 플랜, no auto-push, main 머지 전 user 승인

## Execution

Plan complete. Save 후 execution 방식 사용자 선택:

1. **Subagent-Driven** (권장) — Task별 fresh subagent, 중간 리뷰, 빠른 반복
2. **Inline Execution** — 현재 세션에서 executing-plans로 배치 실행, 체크포인트
