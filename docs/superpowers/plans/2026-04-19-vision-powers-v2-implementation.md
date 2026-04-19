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

- [x] **Step 1: 파일 작성** — 내용 구조 (스펙 §3.1 기반):

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
paper-2      → secondaryColor, tertiaryColor (서브그래프/컨테이너 배경)
ink          → primaryTextColor, primaryBorderColor
muted        → lineColor, secondaryTextColor
accent       → primaryColor (focal 노드)
accent-tint  → primaryColor fill tint (focal 노드 내부 채움)
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

- [x] **Step 2: 검증** — Read 또는 `cat`으로 확인. 표 6개가 전부 포함됐는지.

- [x] **Step 3: Commit**

```bash
git add plugins/vision-powers/references/design-system/semantic-tokens.md
git commit -m "Add Layer 0 semantic-tokens.md — unified color and font source for all vision-powers skills"
```

---

### Task 2: Layer 0 — diagram-type-selection.md 작성

**Files:**
- Create: `plugins/vision-powers/references/design-system/diagram-type-selection.md`

- [x] **Step 1: 파일 작성** (스펙 §3.2 기반):

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

- [x] **Step 2: Commit**

```bash
git add plugins/vision-powers/references/design-system/diagram-type-selection.md
git commit -m "Add Layer 0 diagram-type-selection.md — 13 types with selection guide for section-analyzer"
```

---

### Task 3: Layer 0 — diagram-density-rules.md 작성

**Files:**
- Create: `plugins/vision-powers/references/design-system/diagram-density-rules.md`

- [x] **Step 1: 파일 작성**:

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

- [x] **Step 2: Commit**

```bash
git add plugins/vision-powers/references/design-system/diagram-density-rules.md
git commit -m "Add Layer 0 diagram-density-rules.md — complexity budget per type, focal rule, split rule"
```

---

### Task 4: Layer 0 — taste-gate.md 작성

**Files:**
- Create: `plugins/vision-powers/references/design-system/taste-gate.md`

- [x] **Step 1: 파일 작성**:

```markdown
# Taste Gate — Pre-output Checklist

diagram-generator 출력물이 최종 리포트에 들어가기 **전** 반드시 통과해야 하는 체크리스트. `scripts/taste-gate.js`가 이 파일의 규칙을 JSON으로 변환해 실행.

## Type fit
- [x] 타입이 섹션 의도에 맞나? (diagram-type-selection.md 재확인)
- [x] 3-column 테이블로 같은 정보 전달 가능? → 그렇다면 **다이어그램 삭제**

## Remove test
- [x] 노드 하나 지워도 독자가 이해 가능? → 그 노드 **불필요**
- [x] 두 노드가 항상 붙어 다님? → **하나로 병합**
- [x] arrow가 layout만으로 명백함? → arrow **삭제**
- [x] label이 색/모양으로 이미 signal? → label **삭제**

## Signal
- [x] accent (focal) ≤ 2?
- [x] legend가 사용된 모든 타입 커버 + 쓸데없는 항목 없음?
- [x] Complexity budget (density-rules.md) 준수?

## Technical (파서 안정성)
- [x] arrow label에 opaque mask? (없으면 선이 label을 통과)
- [x] `writing-mode: vertical` 없음?
- [x] Mermaid classDef에 `rgba()` / `rgb()` 없음? (파서 붕괴)
- [x] classDef에 `color:` 없음? (다크모드 파괴, CSS 오버라이드 사용)
- [x] sequenceDiagram message에 `{}[]<>&` 없음?
- [x] stateDiagram-v2에 `<br/>` 없음?

## Typography
- [x] 사람 이름 / 노드 이름 = body sans (mono 금지)?
- [x] 기술 콘텐츠 (포트, URL, 경로, 필드 타입) = mono?
- [x] JetBrains Mono 없음?

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

- [x] **Step 2: Commit**

```bash
git add plugins/vision-powers/references/design-system/taste-gate.md
git commit -m "Add Layer 0 taste-gate.md — pre-output checklist, enforced by scripts/taste-gate.js"
```

---

### Task 5: mermaid-patterns.md 13 타입 syntax 보강

**Files:**
- Modify: `plugins/vision-powers/references/design-system/mermaid-patterns.md`

- [x] **Step 1: 현재 파일 확인**

```bash
wc -l plugins/vision-powers/references/design-system/mermaid-patterns.md
```

- [x] **Step 2: 파일 끝에 새 섹션 추가** — 기존 Diagram Authoring Rules 섹션 뒤에:

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

- [x] **Step 3: Commit**

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

- [x] **Step 1: 현재 참조 찾기 (파일명 + 자연어 모두)**

```bash
# 1-a: 파일명 기반 참조
grep -rn "color-palette.md\|font-system.md\|diagram-argumentation.md\|anti-slop-rules.md" plugins/vision-powers/ | grep -v "\.git"

# 1-b: 자연어 참조 (스킬 본문이 "Font system", "Color palette", "Anti-slop rules" 같은 문구로 가리킬 수 있음)
grep -rEn "font[- ]system|color[- ]palette|anti[- ]slop|diagram[- ]argumentation" plugins/vision-powers/ --include='*.md' | grep -v "\.git"
```

- [x] **Step 2: 각 참조 위치에서 치환**

- `color-palette.md` → `semantic-tokens.md`
- `font-system.md` → `semantic-tokens.md` (중복되면 한 줄로 병합)
- `diagram-argumentation.md` → `diagram-density-rules.md` + `taste-gate.md` (문맥 따라)
- `anti-slop-rules.md` → `taste-gate.md`

**특히 plugin-visual/SKILL.md의 "Read 4 reference files" 블록**: 기존 4개 경로(JSON schema / font-system / anti-slop-rules / color-palette)를 새 5개(JSON schema + Layer 0 4개: semantic-tokens / diagram-type-selection / diagram-density-rules / taste-gate)로 **교체**한다. `${CLAUDE_PLUGIN_ROOT}/references/design-system/` 경로 prefix 유지.

Edit 도구로 각 파일 수정.

- [x] **Step 3: 파일 삭제**

```bash
rm plugins/vision-powers/references/design-system/color-palette.md
rm plugins/vision-powers/references/design-system/font-system.md
rm plugins/vision-powers/references/design-system/diagram-argumentation.md
rm plugins/vision-powers/references/design-system/anti-slop-rules.md
```

- [x] **Step 4: 깨진 참조 재확인 (파일명 + 자연어 sweep)**

```bash
grep -rn "color-palette.md\|font-system.md\|diagram-argumentation.md\|anti-slop-rules.md" plugins/vision-powers/ | grep -v "\.git"
grep -rEn "font[- ]system\.md|color[- ]palette\.md|anti[- ]slop[- ]rules\.md|diagram[- ]argumentation\.md" plugins/vision-powers/ | grep -v "\.git"
```

Expected: 두 grep 모두 0건.

- [x] **Step 5: Commit**

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

- [x] **Step 1: Write failing test**

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

- [x] **Step 2: Verify test fails**

```bash
cd plugins/vision-powers/scripts && node --test parse-markdown.test.js
```

Expected: FAIL with "Cannot find module './parse-markdown'".

- [x] **Step 3: Implement parse-markdown.js**

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

- [x] **Step 4: Verify tests pass**

```bash
cd plugins/vision-powers/scripts && node --test parse-markdown.test.js
```

Expected: PASS (6/6).

- [x] **Step 5: Commit**

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

- [x] **Step 1: Write failing test** (12 tests — 스펙 §3.3 차원별 제약 + §3.4 technical 항목 + reserved-word 회귀 방지)

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

test('detects rgba in classDef (case-insensitive)', () => {
  const mermaid = 'flowchart TD\n  A --> B\n  classDef hl fill:RGBA(181,82,58,0.2)';
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

test('detects too many arrows', () => {
  let arrows = '';
  for (let i = 0; i < 14; i += 1) arrows += `  X${i} --> Y${i}\n`;
  const mermaid = `flowchart TD\n${arrows}`;
  const result = runTasteGate({ mermaid, type: 'flowchart' });
  assert.ok(result.violations.some(v => v.rule === 'max-arrows-exceeded'));
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

test('detects sequence lifelines over budget (5)', () => {
  const mermaid = 'sequenceDiagram\n  participant A\n  participant B\n  participant C\n  participant D\n  participant E\n  participant F\n  A->>B: hi';
  const result = runTasteGate({ mermaid, type: 'sequence' });
  assert.ok(result.violations.some(v => v.rule === 'max-lifelines-exceeded'));
});

test('detects swimlane lanes over budget (5)', () => {
  const mermaid = 'flowchart LR\n  subgraph L1\n  end\n  subgraph L2\n  end\n  subgraph L3\n  end\n  subgraph L4\n  end\n  subgraph L5\n  end\n  subgraph L6\n  end';
  const result = runTasteGate({ mermaid, type: 'swimlane' });
  assert.ok(result.violations.some(v => v.rule === 'max-lanes-exceeded'));
});

test('detects color in classDef', () => {
  const mermaid = 'flowchart TD\n  A --> B\n  classDef x color:#fff,fill:#111';
  const result = runTasteGate({ mermaid, type: 'flowchart' });
  assert.ok(result.violations.some(v => v.rule === 'no-color-in-classdef'));
});

test('detects writing-mode vertical anywhere', () => {
  const mermaid = 'flowchart TD\n  A --> B\n  classDef v writing-mode:vertical-rl';
  const result = runTasteGate({ mermaid, type: 'flowchart' });
  assert.ok(result.violations.some(v => v.rule === 'no-vertical-writing-mode'));
});

test('reserved keyword (subgraph) is not counted as a node', () => {
  // subgraph/Frontend/Backend는 구조 키워드. 실제 노드는 A, B 2개뿐.
  // countNodes regex가 line-beginning 키워드까지 잡으면 maxNodes 오탐.
  const mermaid = 'flowchart TD\n  subgraph Frontend\n    A[React]\n  end\n  subgraph Backend\n    B[API]\n  end\n  A --> B';
  const result = runTasteGate({ mermaid, type: 'flowchart' });
  assert.ok(!result.violations.some(v => v.rule === 'max-nodes-exceeded'),
    'subgraph/Frontend/Backend이 노드로 카운트되면 안 됨');
});

test('sequence participant 라인은 lifeline만 카운트 (node counter 간섭 없음)', () => {
  // participant 키워드 자체는 lifeline counter에서만 처리.
  // maxNodes 필드가 없는 sequence 타입에서 countNodes가 호출되지 않아야 함.
  const mermaid = 'sequenceDiagram\n  participant A\n  participant B\n  A->>B: hi';
  const result = runTasteGate({ mermaid, type: 'sequence' });
  assert.strictEqual(result.ok, true);
});
```

- [x] **Step 2: Verify test fails**

```bash
cd plugins/vision-powers/scripts && node --test taste-gate.test.js
```

Expected: FAIL.

- [x] **Step 3: Implement taste-gate.js**

스펙 §3.3 차원별 제약을 **의미 그대로** 반영한다. 단순 `maxNodes`로 납작화하지 말고 `maxLifelines / maxLanes / maxDepth / maxLevels / maxEntities / maxCircles / maxLayers` 필드를 추가해 타입별 validator로 분기.

```javascript
// scripts/taste-gate.js
'use strict';

// 스펙 §3.3 — 차원별 제약. 각 필드는 해당 타입에만 의미 있음.
const DENSITY_BUDGETS = {
  flowchart:    { maxNodes: 9, maxArrows: 12 },
  architecture: { maxNodes: 9, maxArrows: 12 },
  sequence:     { maxLifelines: 5 },          // "sequence lifelines 5"
  state:        { maxNodes: 9, maxArrows: 12 },
  ER:           { maxEntities: 8 },           // "ER entities 8"
  timeline:     { maxNodes: 9 },
  swimlane:     { maxLanes: 5 },              // "swimlane lanes 5"
  quadrant:     { maxItems: 12 },             // "quadrant items 12"
  nested:       { maxLevels: 6 },             // "nested levels 6"
  tree:         { maxDepth: 4 },              // "tree depth 4"
  layer:        { maxLayers: 6 },             // "layer stack 6"
  venn:         { maxCircles: 3 },            // "venn circles 3"
  pyramid:      { maxLayers: 6 },             // "pyramid layers 6"
};

// 공통 노드 ID 카운터 (flowchart/architecture/state/timeline 등 일반형)
function countNodes(mermaid) {
  const nodeIds = new Set();
  const re = /^\s*([A-Za-z_]\w*)(?:\[|\{|\(|$|\s+-->|\s+\.->|\s+==>)/gm;
  for (const m of mermaid.matchAll(re)) nodeIds.add(m[1]);
  return nodeIds.size;
}

function countArrows(mermaid) {
  return (mermaid.match(/-->|\.->|==>|-\.->/g) || []).length;
}

function countLifelines(mermaid) {
  return (mermaid.match(/^\s*participant\s+\w+/gm) || []).length;
}

function countLanes(mermaid) {
  return (mermaid.match(/^\s*subgraph\s+/gm) || []).length;
}

function countEntities(mermaid) {
  // erDiagram: `USER {` or `USER ||--o{ ORDER`
  const ids = new Set();
  for (const m of mermaid.matchAll(/^\s*([A-Z_][A-Z_0-9]*)\s*(?:\{|\|\|--|\}o--|\|\|\.\.|o\|--)/gm)) {
    ids.add(m[1]);
  }
  return ids.size;
}

function maxNestedDepth(mermaid) {
  let depth = 0;
  let max = 0;
  for (const line of mermaid.split('\n')) {
    if (/^\s*subgraph\b/.test(line)) {
      depth += 1;
      if (depth > max) max = depth;
    } else if (/^\s*end\b/.test(line)) {
      depth = Math.max(0, depth - 1);
    }
  }
  return max;
}

function maxTreeDepth(mermaid) {
  // Simple heuristic: follow `-->` edges, estimate longest path.
  const edges = [];
  for (const m of mermaid.matchAll(/(\w+)\s*-->\s*(\w+)/g)) edges.push([m[1], m[2]]);
  if (edges.length === 0) return 0;
  const children = new Map();
  const hasParent = new Set();
  for (const [p, c] of edges) {
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(c);
    hasParent.add(c);
  }
  const roots = [...new Set(edges.map(([p]) => p))].filter(n => !hasParent.has(n));
  const walk = (n, d, seen = new Set()) => {
    if (seen.has(n)) return d;
    seen.add(n);
    const kids = children.get(n) || [];
    if (kids.length === 0) return d;
    return Math.max(...kids.map(k => walk(k, d + 1, seen)));
  };
  return Math.max(0, ...roots.map(r => walk(r, 1)));
}

function runTasteGate({ mermaid, type }) {
  const violations = [];

  // Technical (파서/렌더러 붕괴 방지) — 스펙 §3.4
  if (/classDef[^\n]*r?gba?\s*\(/i.test(mermaid)) {
    violations.push({ rule: 'no-rgba-in-classdef', hint: 'Use 8-digit hex #RRGGBBAA instead' });
  }
  if (/classDef[^\n]*\bcolor\s*:/.test(mermaid)) {
    violations.push({ rule: 'no-color-in-classdef', hint: 'Let CSS overrides handle text via var(--text)' });
  }
  if (/writing-mode\s*:\s*vertical/i.test(mermaid)) {
    violations.push({ rule: 'no-vertical-writing-mode', hint: 'Vertical writing mode breaks SVG text measurement' });
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

  // NOTE: 자동화하지 않은 §3.4 체크 — diagram-generator 프롬프트로 간접 강제:
  //   - arrow label opaque mask (선이 label 통과 방지)
  //   - "remove test" (node/edge 삭제 가능성 판단)
  //   - 3-column 테이블 대체 가능성

  // Density budget (스펙 §3.3) — 타입별 validator 분기
  const budget = DENSITY_BUDGETS[type] || { maxNodes: 9, maxArrows: 12 };

  if (budget.maxNodes != null) {
    const n = countNodes(mermaid);
    if (n > budget.maxNodes) violations.push({ rule: 'max-nodes-exceeded', hint: `${type} budget ${budget.maxNodes}, got ${n}` });
  }
  if (budget.maxArrows != null) {
    const n = countArrows(mermaid);
    if (n > budget.maxArrows) violations.push({ rule: 'max-arrows-exceeded', hint: `${type} arrows budget ${budget.maxArrows}, got ${n}` });
  }
  if (budget.maxLifelines != null) {
    const n = countLifelines(mermaid);
    if (n > budget.maxLifelines) violations.push({ rule: 'max-lifelines-exceeded', hint: `sequence lifelines budget ${budget.maxLifelines}, got ${n}` });
  }
  if (budget.maxLanes != null) {
    const n = countLanes(mermaid);
    if (n > budget.maxLanes) violations.push({ rule: 'max-lanes-exceeded', hint: `swimlane lanes budget ${budget.maxLanes}, got ${n}` });
  }
  if (budget.maxEntities != null) {
    const n = countEntities(mermaid);
    if (n > budget.maxEntities) violations.push({ rule: 'max-entities-exceeded', hint: `ER entities budget ${budget.maxEntities}, got ${n}` });
  }
  if (budget.maxLevels != null) {
    const n = maxNestedDepth(mermaid);
    if (n > budget.maxLevels) violations.push({ rule: 'max-levels-exceeded', hint: `nested levels budget ${budget.maxLevels}, got ${n}` });
  }
  if (budget.maxDepth != null) {
    const n = maxTreeDepth(mermaid);
    if (n > budget.maxDepth) violations.push({ rule: 'max-depth-exceeded', hint: `tree depth budget ${budget.maxDepth}, got ${n}` });
  }
  // venn maxCircles, quadrant maxItems, pyramid/layer maxLayers는 Mermaid 원본이 아니므로
  // 여기서는 스킵. 대신 assemble-report.js의 `validateFallbackBudget(sec)` 헬퍼가
  // renderDocVisualSection 전 단계에서 검증한다 (Task 12 Step 4-b 참고).

  // Focal — accent 남용 감지
  const accentMatches = (mermaid.match(/:::accent\b|class\s+\w+\s+accent/g) || []).length;
  if (accentMatches > 2) {
    violations.push({ rule: 'too-many-accents', hint: `accent on ${accentMatches} elements, max 2` });
  }

  return { ok: violations.length === 0, violations };
}

module.exports = { runTasteGate, DENSITY_BUDGETS };
```

- [x] **Step 4: Verify tests pass**

```bash
cd plugins/vision-powers/scripts && node --test taste-gate.test.js
```

Expected: PASS (12/12).

만약 새 2건(reserved keyword / sequence participant)이 실패하면 `countNodes` regex가 line-beginning 예약어까지 잡는 오탐을 의미. alternation 뒤 문자 클래스를 타이트하게(`\s+-->`, `\s+-\.->`, `\s+==>`, `$` 등) 유지하고 있는지 재검증.

- [x] **Step 5: Commit**

```bash
git add plugins/vision-powers/scripts/taste-gate.js plugins/vision-powers/scripts/taste-gate.test.js
git commit -m "Add scripts/taste-gate.js — enforces Layer 0 taste-gate rules with per-type validators (TDD, 12 tests)"
```

---

## Phase 3 — doc-visual agents / template / skill

### Task 9: agents/section-analyzer.md 작성

**Files:**
- Create: `plugins/vision-powers/agents/section-analyzer.md`

- [x] **Step 1: 기존 agent 프론트매터 형식 확인**

플러그인 내 기존 agent(`visual-report-writer.md`, `feature-architect.md` 등)의 프론트매터 구조를 확인해 동일 관례를 따른다. 특히 `description`이 block scalar(`|`)를 쓰는지 flow scalar를 쓰는지, `tools` 필드 형식이 comma-list인지 flow seq인지.

```bash
head -15 plugins/vision-powers/agents/visual-report-writer.md
head -15 plugins/vision-powers/agents/feature-architect.md
```

기존이 block scalar를 안 쓰면 아래 예시의 `description: |` 를 단일 줄로 바꿀 것.

- [x] **Step 2: 파일 작성**:

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

- [x] **Step 3: Commit**

```bash
git add plugins/vision-powers/agents/section-analyzer.md
git commit -m "Add agents/section-analyzer.md — decide diagram type per section using Layer 0 selection guide"
```

---

### Task 10: agents/diagram-generator.md 작성

**Files:**
- Create: `plugins/vision-powers/agents/diagram-generator.md`

- [x] **Step 1: 기존 agent 프론트매터 형식 확인** — Task 9 Step 1과 동일. section-analyzer.md와도 형식 일치.

- [x] **Step 2: 파일 작성**:

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

- [x] **Step 3: Commit**

```bash
git add plugins/vision-powers/agents/diagram-generator.md
git commit -m "Add agents/diagram-generator.md — generate Mermaid + 3-5 line summary per section"
```

---

### Task 11: templates/doc-visual.html 작성

**Files:**
- Create: `plugins/vision-powers/templates/doc-visual.html`

- [x] **Step 1: 기존 diff-visual.html 구조 확인**

```bash
wc -l plugins/vision-powers/templates/diff-visual.html
head -80 plugins/vision-powers/templates/diff-visual.html
```

- [x] **Step 2: doc-visual.html 작성** (기본 스켈레톤):

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

- [x] **Step 3: Commit**

```bash
git add plugins/vision-powers/templates/doc-visual.html
git commit -m "Add templates/doc-visual.html — dynamic section layout, Layer 0 tokens via CSS custom properties"
```

---

### Task 12: scripts/assemble-report.js 확장 (doc-visual 지원)

**Files:**
- Modify: `plugins/vision-powers/scripts/assemble-report.js`
- Modify: `plugins/vision-powers/references/report-generation-workflow.md`

⚠️ **Context**: 기존 `assemble-report.js`는 **디렉터리 모델**을 사용한다. `--sections <dir>`에서 `section-N.html`을 읽어 템플릿의 `<!-- SECTION_N: ... -->` 주석 플레이스홀더에 주입. 메타데이터는 `<!-- CSS_VARIABLES -->` 같은 **주석 플레이스홀더**(`METADATA_KEYS` uppercase).

doc-visual 템플릿(Task 11)은 **중괄호 플레이스홀더**(`{TOKEN_PAPER}`, `{SECTIONS_HTML}`, `{TOC_HTML}`)를 쓰고, 섹션은 **단일 JSON 파일**에서 읽는다. 두 모델을 동시에 수용해야 하므로 "분기 추가"가 아니라 **입력 모드 판별 + 새 placeholder parser + JSON 섹션 렌더러** 세 부분으로 나누어 작업.

- [x] **Step 1: 현재 인프라 이해**

```bash
wc -l plugins/vision-powers/scripts/assemble-report.js
cat plugins/vision-powers/scripts/assemble-report.js
```

확인 포인트: `METADATA_KEYS`, `SHARED_PLACEHOLDERS`, `sectionFiles` 읽기 루프, `aesthetic-rotation.js spawnSync` 자동 호출 경로.

- [x] **Step 2: 새 입력 모드 판별 로직 추가**

`--sections` 인자가 **디렉터리**면 기존 로직, **`.json` 파일**이면 doc-visual 모드 (`{ sections: [...] }` JSON 파싱).

```js
const sectionsArg = args.sections;
const sectionsStat = fs.statSync(sectionsArg);
const isJsonInput = sectionsStat.isFile() && sectionsArg.endsWith('.json');
```

추가로 `--skill-prefix doc-visual`가 오면 `isJsonInput`을 true로 강제(방어적).

- [x] **Step 3: 중괄호 placeholder parser 추가 (기존 주석 placeholder와 공존)**

기존 주석 치환은 그대로. 중괄호 치환은 doc-visual 템플릿에서만 발생. Token 치환은 `{TOKEN_*}` (예: `{TOKEN_PAPER}`), 구조 치환은 `{TOC_HTML}`, `{SECTIONS_HTML}`, `{DOC_TITLE}`, `{SOURCE_PATH}`, `{TIMESTAMP}`, `{LANG}`, `{COLOR_SCHEME}`, `{SHARED_JS}`.

```js
function replaceCurly(html, map) {
  return html.replace(/\{([A-Z_][A-Z0-9_]*)\}/g, (m, key) => (key in map ? map[key] : m));
}
```

치환 맵은 `metadata.css_variables`에서 추출하거나, doc-visual 메타데이터 JSON에서 직접 제공.

- [x] **Step 4: JSON 섹션 렌더러 (doc-visual 전용)**

`skills/doc-visual/references/section-structure.md` 템플릿을 참고해 `section-structure` 헬퍼 함수로 렌더링.

```js
function renderDocVisualSection(sec) {
  const heroAttr = sec.diagram_plan?.is_hero ? ' data-is-hero="true"' : '';
  const level = sec.level || 2;
  // NOTE: mermaid_code는 HTML escape 금지 — `%%{init: {...}}%%`의 `{`가
  // `&#123;`으로 치환되면 Mermaid 파서가 즉시 깨진다. `<pre class="mermaid">`는
  // raw 텍스트 그대로여야 Mermaid가 파싱할 수 있다. taste-gate.js가 이미
  // `{}[]<>&` 같은 위험 문자를 특정 타입에서 차단하므로, LLM이 생성한 Mermaid
  // 본문을 신뢰(trusted)하고 raw로 주입한다.
  const body = `<section id="${sec.id}" class="doc-section depth-${level}"${heroAttr}>
    <h${level}>${escapeHtml(sec.heading || '')}</h${level}>
    <p class="summary">${escapeHtml(sec.summary || '')}</p>
    ${sec.diagram_plan?.skip_diagram ? '' : `<div class="mermaid-wrap"><pre class="mermaid">${sec.mermaid_code}</pre></div>`}
  </section>`;
  return body;
}
```

TOC도 같은 입력에서 생성.

- [x] **Step 4-b: Fallback 렌더러 budget 검증 (venn / pyramid / quadrant)**

`taste-gate.js`는 Mermaid 소스 검증만 수행하므로, Mermaid 미지원 타입(venn / pyramid) 및 quadrant item 개수 같은 차원은 `assemble-report.js`의 fallback 렌더러 입력 단계에서 **명시적으로** 검증한다. 위치: `renderDocVisualSection` 또는 별도 `renderFallbackDiagram(sec)` 헬퍼.

```js
const FALLBACK_BUDGETS = {
  venn:     { maxCircles: 3 },   // Layer 0 density-rules.md
  pyramid:  { maxLayers: 6 },
  quadrant: { maxItems: 12 },
};

function validateFallbackBudget(sec) {
  const t = sec.diagram_plan?.diagram_type;
  const budget = FALLBACK_BUDGETS[t];
  if (!budget) return { ok: true };
  const items = sec.fallback_data?.items || [];
  if (t === 'venn' && items.length > budget.maxCircles) {
    return { ok: false, rule: 'max-circles-exceeded', got: items.length };
  }
  if (t === 'pyramid' && items.length > budget.maxLayers) {
    return { ok: false, rule: 'max-layers-exceeded', got: items.length };
  }
  if (t === 'quadrant' && items.length > budget.maxItems) {
    // 스펙 §5 "top 12만 표시" — 슬라이스로 하향
    sec.fallback_data.items = items.slice(0, budget.maxItems);
    return { ok: true, truncated: true };
  }
  return { ok: true };
}
```

budget 위반 시: venn/pyramid는 warn 로그 + 다이어그램 skip, quadrant는 상위 12개로 자동 절단(스펙 §3.3 "top 12만 표시"와 일치).

SKILL.md 파이프라인 문서(Task 13)와 report-generation-workflow.md(Step 7)에도 "fallback budget 검증은 assemble-report.js의 `validateFallbackBudget`에서 수행"이라고 명시.

- [x] **Step 5: Markdown 모드 분기 (`--format md`)**

HTML 템플릿 생략, 섹션 배열을 직접 조립:

~~~
## {heading}

{summary}

```mermaid
{mermaid_code}
```
~~~

`skip_diagram: true` 섹션은 mermaid 블록 생략. 마지막에 `\n---\n**원본**: {source_path}\n**생성**: vision-powers doc-visual · {timestamp}\n` 푸터.

- [x] **Step 6: Output basename sanitize**

doc-visual 출력 경로 `${CLAUDE_PLUGIN_DATA}/reports/{doc-basename}-doc-visual.html`에서 basename에 공백/특수문자가 포함될 수 있음. 안전하게 치환:

```js
function sanitizeBasename(name) {
  return name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'doc';
}
```

- [x] **Step 7: report-generation-workflow.md에 doc-visual 섹션 추가**

파이프라인 문서화: `parse-markdown → section-analyzer → diagram-generator → taste-gate → assemble-report`. 각 단계 입출력 JSON 스키마 명시. 기존 섹션(디렉터리 모델 설명)은 **유지**하고 doc-visual 모드는 별도 sub-section으로 분리.

- [x] **Step 8: 무회귀 스모크 (기존 경로 확인)**

기존 디렉터리 모델이 깨지지 않았는지 확인 — diff-visual / plugin-visual / context-health-visual 중 하나라도 실제로 실행해서 기존 스킬 산출물이 정상인지.

```bash
claude --plugin-dir ./plugins/vision-powers
# 다른 터미널에서: analyze ./plugins/vision-powers (plugin-visual 호출)
```

산출물 열어 섹션 주석 치환 + 메타데이터 치환 + aesthetic-rotation 기록 호출이 모두 정상인지.

- [x] **Step 9: doc-visual 스모크**

간단한 `sections.json` 스텁으로 `--sections sections.json --skill-prefix doc-visual --format html --output /tmp/doc-visual-smoke.html` 실행. 열어서 중괄호 치환 + 섹션 주입 + skip_diagram 처리 확인.

- [x] **Step 10: Commit**

```bash
git add plugins/vision-powers/scripts/assemble-report.js plugins/vision-powers/references/report-generation-workflow.md
git commit -m "Extend assemble-report.js: dual input mode (dir of section-N.html | sections.json), curly placeholder parser for doc-visual, basename sanitize"
```

---

### Task 13: skills/doc-visual/SKILL.md 작성

**Files:**
- Create: `plugins/vision-powers/skills/doc-visual/SKILL.md`

- [x] **Step 1: 파일 작성**:

```markdown
---
name: doc-visual
description: |
  임의 마크다운 문서(research/spec/RFC/ADR/design)를 다이어그램 강화된 리포트로 변환.
  Use when asked to visualize, explain, or make a document easier to understand —
  "이 문서 다이어그램으로 깨줘", "visualize this research", "make this design doc easier to read",
  "summarize this spec with diagrams". 단일 md 파일 입력.
argument-hint: "[md-file-path] [--format html|md] [--lang code]"
allowed-tools: Read, Agent, Bash(node *), Bash(open *), Bash(rm -rf /tmp/doc-visual-*)
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
- **H4+ 헤더** → `parse-markdown.js`는 H1/H2/H3만 섹션 경계로 인식 (스펙 §4.5).
  H4 이상은 해당 부모 H2/H3 섹션의 `body`에 마크다운 그대로 포함되어 요약 대상이 된다.
  독립 섹션으로 분리되지 않음. 요약이 너무 길어질 경우 section-analyzer가 내부
  구조를 인지하고 요약 시 서브 토픽으로 압축 — 그러나 개별 다이어그램을 얻고 싶다면
  원본 md의 H4를 H3로 올려야 한다.

### Reference Files

- `../../references/design-system/semantic-tokens.md`
- `../../references/design-system/diagram-type-selection.md`
- `../../references/design-system/diagram-density-rules.md`
- `../../references/design-system/taste-gate.md`
- `../../references/design-system/mermaid-patterns.md`
- `../../references/report-generation-workflow.md`
- `references/section-structure.md`
```

- [x] **Step 2: Commit**

```bash
git add plugins/vision-powers/skills/doc-visual/SKILL.md
git commit -m "Add skills/doc-visual/SKILL.md — hybrid pipeline (parse -> analyze -> generate -> gate -> assemble)"
```

---

### Task 14: skills/doc-visual/references/section-structure.md

**Files:**
- Create: `plugins/vision-powers/skills/doc-visual/references/section-structure.md`

- [x] **Step 1: 파일 작성**:

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

- [x] **Step 2: Commit**

```bash
git add plugins/vision-powers/skills/doc-visual/references/section-structure.md
git commit -m "Add doc-visual section-structure.md — HTML and markdown section templates"
```

---

## Phase 4 — aesthetic-rotation 재정의

### Task 15: scripts/aesthetic-rotation.js 토큰 세트 기반 (CLI API 보존)

**Files:**
- Modify: `plugins/vision-powers/scripts/aesthetic-rotation.js`

⚠️ **Critical**: 기존 구현은 `recent | record | extract` **CLI 서브커맨드**이고 이미 다수의 호출자가 의존한다:
- `plugin-visual/SKILL.md` allowed-tools: `Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/aesthetic-rotation.js recent --n 3)`
- `assemble-report.js` 내부 `spawnSync("node", [script, "extract", "--metadata", ...])`
- `visual-report-writer.md`, `report-generation-workflow.md`가 CLI 사용 안내

CLI를 **유지**하면서 내부에 `TOKEN_SETS` 상수를 추가하고 새 `pick` 서브커맨드로 토큰 세트 JSON을 노출한다. module export는 부가 채널. **기존 호출은 수정 없이 동작해야 한다**.

- [x] **Step 1: 현재 파일 읽기 + 호출자 목록 확보**

```bash
cat plugins/vision-powers/scripts/aesthetic-rotation.js
grep -rn "aesthetic-rotation" plugins/vision-powers/ | grep -v "\.git"
```

현재 CLI 형상을 노트로 남긴다: `parseArgs`, `resolveHistoryPath`, `readHistory / writeHistory`, `normalizeFont / normalizeHex`, `cmdRecent / cmdRecord / cmdExtract`, `main`의 switch.

- [x] **Step 2: `TOKEN_SETS` 상수 추가 (파일 상단, 기존 `MAX_ENTRIES` 근처)**

스펙 §3.1의 6개 세트. 기존 구현 스타일(require("fs"), CommonJS)과 일치시킨다.

```javascript
const TOKEN_SETS = [
  {
    id: "warm-stone", scheme: "light",
    tokens: { paper:"#faf7f2", "paper-2":"#f2ede4", ink:"#1c1917", muted:"#57534e", soft:"#78716c", rule:"rgba(28,25,23,0.12)", accent:"#b5523a", "accent-tint":"rgba(181,82,58,0.08)", link:"#2563eb" },
    fonts: { title:"'Instrument Serif', serif", body:"'Geist', sans-serif", mono:"'Geist Mono', monospace" },
  },
  { id:"cool-slate", scheme:"light",
    tokens: { paper:"#f1f5f9", "paper-2":"#e2e8f0", ink:"#0f172a", muted:"#475569", soft:"#64748b", rule:"rgba(15,23,42,0.12)", accent:"#0369a1", "accent-tint":"rgba(3,105,161,0.10)", link:"#2563eb" },
    fonts: { title:"'Instrument Serif', serif", body:"'Geist', sans-serif", mono:"'Geist Mono', monospace" },
  },
  { id:"editorial-ink", scheme:"light",
    tokens: { paper:"#fafaf9", "paper-2":"#f5f5f4", ink:"#18181b", muted:"#52525b", soft:"#71717a", rule:"rgba(24,24,27,0.12)", accent:"#7c2d12", "accent-tint":"rgba(124,45,18,0.10)", link:"#1d4ed8" },
    fonts: { title:"'Instrument Serif', serif", body:"'Geist', sans-serif", mono:"'Geist Mono', monospace" },
  },
  { id:"blueprint", scheme:"light",
    tokens: { paper:"#eff6ff", "paper-2":"#dbeafe", ink:"#1e3a8a", muted:"#3730a3", soft:"#4338ca", rule:"rgba(30,58,138,0.12)", accent:"#dc2626", "accent-tint":"rgba(220,38,38,0.10)", link:"#1d4ed8" },
    fonts: { title:"'Instrument Serif', serif", body:"'Geist', sans-serif", mono:"'Geist Mono', monospace" },
  },
  { id:"warm-stone-dark", scheme:"dark",
    tokens: { paper:"#1c1917", "paper-2":"#292524", ink:"#faf7f2", muted:"#a8a29e", soft:"#78716c", rule:"rgba(250,247,242,0.12)", accent:"#d6724a", "accent-tint":"rgba(214,114,74,0.10)", link:"#60a5fa" },
    fonts: { title:"'Instrument Serif', serif", body:"'Geist', sans-serif", mono:"'Geist Mono', monospace" },
  },
  { id:"cool-slate-dark", scheme:"dark",
    tokens: { paper:"#0f172a", "paper-2":"#1e293b", ink:"#f1f5f9", muted:"#94a3b8", soft:"#64748b", rule:"rgba(241,245,249,0.12)", accent:"#38bdf8", "accent-tint":"rgba(56,189,248,0.10)", link:"#60a5fa" },
    fonts: { title:"'Instrument Serif', serif", body:"'Geist', sans-serif", mono:"'Geist Mono', monospace" },
  },
];
```

- [x] **Step 3: 폴백 경로는 기존 그대로 유지** (`~/.claude/plugins/data/vision-powers/aesthetic-history.json`)

`resolveHistoryPath` 함수를 **수정하지 않는다**. 홈 디렉터리 직접 오염(예: `~/.vision-powers-data`)은 CLAUDE.md의 플러그인 데이터 경로 규칙과 어긋난다.

- [x] **Step 4: 새 `pick` 서브커맨드 추가 (기존 CLI 확장)**

`cmdPick(args)` 함수를 추가하고 `main()`의 switch에 `"pick"` 케이스를 추가. `recent`의 기존 구조(`--n`, `--history`, `--skill`) 관례를 따른다.

```javascript
function cmdPick(args) {
  const file = resolveHistoryPath(args);
  const entries = readHistory(file);
  const preferScheme = args.scheme || null;                    // "light" | "dark" | null
  const recentIds = new Set(entries.slice(-3).map(e => e.set_id).filter(Boolean));
  const pool = TOKEN_SETS.filter(s => !preferScheme || s.scheme === preferScheme);
  const fresh = pool.filter(s => !recentIds.has(s.id));
  const list = fresh.length ? fresh : pool;
  const chosen = list[Math.floor(Math.random() * list.length)];
  // 기록: 기존 entry 스키마 호환 (accent, body_font 등) + 새 set_id 필드 추가
  const entry = {
    at: new Date().toISOString(),
    skill: args.skill || null,
    set_id: chosen.id,
    accent: chosen.tokens.accent,
    body_font: normalizeFont(chosen.fonts.body),
    heading_font: normalizeFont(chosen.fonts.title),
    mono_font: normalizeFont(chosen.fonts.mono),
  };
  if (args.record !== "false") {
    entries.push(entry);
    writeHistory(file, entries.slice(-MAX_ENTRIES));
  }
  process.stdout.write(JSON.stringify(chosen));
}
```

`main()`의 switch에 추가:
```javascript
case "pick": return cmdPick(args);
```

usage 에러 메시지도 확장: `"Usage: aesthetic-rotation.js <recent|record|extract|pick> [flags]"`

- [x] **Step 5: module export 부가 추가 (파일 맨 아래)**

`main()` 호출 **뒤에** 다음 줄 추가:

```javascript
module.exports = { TOKEN_SETS, resolveHistoryPath, readHistory, writeHistory, cmdRecent, cmdRecord, cmdExtract, cmdPick };
```

(기존에는 module.exports 없이 CLI로만 실행됐으므로, 이 추가는 CLI 동작에 무해.)

- [x] **Step 6: 무회귀 스모크 (기존 CLI 호출)**

```bash
node plugins/vision-powers/scripts/aesthetic-rotation.js recent --n 3
# Expected: JSON array of recent entries (빈 배열 또는 기존 history)

node plugins/vision-powers/scripts/aesthetic-rotation.js pick --scheme light
# Expected: JSON object { id, scheme, tokens: {...}, fonts: {...} }
```

`extract` 서브커맨드는 assemble-report.js가 자동 호출하므로 Task 22 스모크에서 확인.

- [x] **Step 7: Commit**

```bash
git add plugins/vision-powers/scripts/aesthetic-rotation.js
git commit -m "Add TOKEN_SETS + pick subcommand to aesthetic-rotation.js; preserve existing CLI (recent/record/extract) and history path"
```

---

## Phase 5 — diff-visual 다이어트

### Phase 5 사전 작업 — 현 섹션 구조 재확인 및 매핑 고정

⚠️ **Critical Context**: 현 `templates/diff-visual.html`에는 `id="code-review"` 등의 섹션 ID가 **존재하지 않는다**. 섹션은 HTML 주석 `<!-- SECTION_1: Executive Summary -->` ~ `<!-- SECTION_10: Re-entry Context -->`로만 표시되고, 실제 내용은 `assemble-report.js`가 외부 `section-N.html` 파일을 읽어 주석 위치에 주입한다. 따라서 "섹션 제거/추가"는 **주석 마커 + section-N.html 파일** 쌍을 함께 다뤄야 한다.

현 → 신 섹션 매핑(스펙 §5.1의 7섹션으로):

| 현재 (N=10) | 운명 | 신 섹션 (N=7) | Mermaid 타입 |
|---|---|---|---|
| SECTION_1 Executive Summary | 유지 (rename) | Overview | — (text + stat cards) |
| SECTION_2 KPI Dashboard | 병합 → Overview | (Overview에 흡수) | — |
| SECTION_3 Module Architecture | 유지 (rename) | Architecture Impact | architecture |
| SECTION_4 Feature Comparisons | 교체 | **New Components** (신규) | architecture |
| SECTION_5 Flow Diagrams | 교체 | **Dependency Shift** (신규) | side-by-side subgraph |
| SECTION_6 File Map | 유지 (강화) | File Map | tree / nested |
| — | 신설 | **Change Classification** | pyramid (Chart.js) |
| — | 신설 | **Hot Spots** | quadrant |
| SECTION_7 Test Coverage | 제거 | — | — |
| SECTION_8 Code Review | 제거 | — | — |
| SECTION_9 Decision Log | 제거 | — | — |
| SECTION_10 Re-entry Context | 제거 | — | — |

**신 7섹션 순서** (assemble-report.js 플레이스홀더 번호): SECTION_1 Overview · SECTION_2 File Map · SECTION_3 Architecture Impact · SECTION_4 Change Classification · SECTION_5 Dependency Shift · SECTION_6 New Components · SECTION_7 Hot Spots.

이 매핑 표는 Task 16 (SKILL.md + section-structure.md 재작성)과 Task 17 (템플릿 + section-N.html 파일 재정렬)의 **단일 진실**.

- [x] **사전 확인 (필수, Task 16 전)** — 위 매핑 표를 사용자에게 제시하고 명시적 승인을 받는다. 매핑이 변경되면 Task 16/17의 모든 Step이 영향을 받으므로, 승인 없이는 Phase 5 진행 금지.

  확인해야 할 판단 지점:
  - 제거되는 4섹션(Code Review / Decisions / Risks / Test Coverage)이 정말 사용되지 않는지 (스펙 §1.1 미사용 주장의 재검증)
  - SECTION_4 Feature Comparisons → New Components 교체가 의도한 바인가
  - SECTION_5 Flow Diagrams → Dependency Shift 교체가 의도한 바인가
  - Change Classification / Hot Spots 신규 섹션의 데이터 출처(git stats, commit 분포 등)가 diff-visual SKILL.md Data Gathering에서 제공 가능한지

  승인 결과(변경 없음 / 수정된 매핑 표)를 이 문서 Phase 5 사전 작업에 inline으로 기록 후 Task 16으로 진행.

---

### Task 16: diff-visual SKILL.md + section-structure.md 다이어트

**Files:**
- Modify: `plugins/vision-powers/skills/diff-visual/SKILL.md`
- Modify: `plugins/vision-powers/skills/diff-visual/references/section-structure.md`

- [x] **Step 1: SKILL.md 다이어트**

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

- [x] **Step 2: references/section-structure.md 재작성**

9섹션 → 7섹션. 각 섹션에 Mermaid 타입 명시:
- Overview: stat cards + Chart.js donut
- File Map: Mermaid tree/nested
- Architecture Impact: Mermaid architecture
- Change Classification: Chart.js pyramid
- Dependency Shift: Mermaid side-by-side subgraph
- New Components: Mermaid architecture
- Hot Spots: Mermaid quadrantChart

Layer 0 참조 강제: 모든 Mermaid 블록 앞에 `%%{init}%%` 필수.

- [x] **Step 3: Commit**

```bash
git add plugins/vision-powers/skills/diff-visual/SKILL.md plugins/vision-powers/skills/diff-visual/references/section-structure.md
git commit -m "Diet diff-visual: 10 sections to 7 (remove review/decisions/risks/tests/timeline, add hot-spots + dep-shift)"
```

---

### Task 17: templates/diff-visual.html 섹션 주석 마커 재정렬 + Layer 0 적용

**Files:**
- Modify: `plugins/vision-powers/templates/diff-visual.html`

⚠️ 이 Task는 "Phase 5 사전 작업"의 매핑 표를 전제로 한다. 매핑에 대한 사용자 확인을 먼저 받을 것.

- [x] **Step 1: 현재 주석 마커 + 구조 확인**

```bash
grep -n "<!-- SECTION_\|^<section\|id=\"" plugins/vision-powers/templates/diff-visual.html
```

Expected: `<!-- SECTION_1: Executive Summary -->` ~ `<!-- SECTION_10: Re-entry Context -->`만 존재(섹션 ID는 없음). 만약 `id="..."` 섹션이 실제로 존재한다면 매핑 표를 재조정 후 이 Task를 다시 계획.

- [x] **Step 2: 주석 마커 교체 (매핑 표의 신 7섹션 순서대로)**

기존 10개 주석 마커를 아래 7개로 교체:

```html
<!-- SECTION_1: Overview — stat cards (lines +/-, files), scope + audience badges -->
<!-- SECTION_2: File Map — tree/nested of changed files grouped by directory -->
<!-- SECTION_3: Architecture Impact — architecture Mermaid + 1-2 paragraph narrative -->
<!-- SECTION_4: Change Classification — Chart.js pyramid (type × %) + table -->
<!-- SECTION_5: Dependency Shift — before/after side-by-side subgraph Mermaid -->
<!-- SECTION_6: New Components — architecture Mermaid focused on added modules -->
<!-- SECTION_7: Hot Spots — quadrantChart (impact vs frequency) -->
```

제거되는 내용: SECTION_7~10에 해당하던 Test Coverage / Code Review / Decision Log / Re-entry Context. SECTION_4 Feature Comparisons와 SECTION_5 Flow Diagrams 자리는 New Components / Dependency Shift로 **교체**. SECTION_2 KPI Dashboard는 SECTION_1 Overview에 흡수(별도 섹션 아님).

- [x] **Step 3: Layer 0 토큰을 CSS custom properties로 주입**

`:root` 블록을 Task 11의 doc-visual.html 패턴과 동일하게 맞춘다:

```css
:root {
  --paper: {TOKEN_PAPER};
  --paper-2: {TOKEN_PAPER_2};
  --ink: {TOKEN_INK};
  --muted: {TOKEN_MUTED};
  --accent: {TOKEN_ACCENT};
  --link: {TOKEN_LINK};
  --rule: {TOKEN_RULE};
}
```

템플릿의 기존 `--font-*`, `--color-*` 커스텀 프로퍼티가 있으면 위 이름으로 정리 또는 alias.

`<script type="module">` Mermaid `initialize({ themeVariables })` 블록도 Layer 0 값(`{TOKEN_ACCENT}` 등)을 사용하도록 수정. assemble-report.js의 새 curly placeholder parser(Task 12 Step 3)가 런타임에 치환한다.

- [x] **Step 4: diff-visual SKILL.md 의 section 생성 로직 정합 확인**

Task 16에서 이미 7섹션으로 교체했는지 재확인:

```bash
grep -n "Overview\|File Map\|Architecture Impact\|Change Classification\|Dependency Shift\|New Components\|Hot Spots\|Test Coverage\|Code Review\|Decision\|Re-entry" plugins/vision-powers/skills/diff-visual/SKILL.md plugins/vision-powers/skills/diff-visual/references/section-structure.md
```

제거된 섹션명(Test Coverage 등)은 SKILL.md / section-structure.md에서도 0건이어야 한다.

- [x] **Step 5: 로컬 렌더 확인**

```bash
claude --plugin-dir ./plugins/vision-powers
# 다른 터미널: visualize diff HEAD
```

생성된 HTML에서:
- 주석이 SECTION_1~7만 존재, SECTION_8 이상 잔여 없음
- Mermaid 다이어그램 7개 섹션에 맞게 렌더
- 레거시 섹션(Test Coverage 등) 문구 미출현
- CSS 변수가 Layer 0 토큰 세트 중 하나로 치환됨

- [x] **Step 6: Commit**

```bash
git add plugins/vision-powers/templates/diff-visual.html
git commit -m "Reorder diff-visual.html section markers to 7 (Overview/FileMap/Arch/Classification/DepShift/NewComponents/HotSpots); wire Layer 0 tokens"
```

---

## Phase 6 — 기존 스킬 Layer 0 적용

### Task 18: plugin-visual / context-health-visual Layer 0 참조 (교체)

**Files:**
- Modify: `plugins/vision-powers/skills/plugin-visual/SKILL.md`
- Modify: `plugins/vision-powers/skills/context-health-visual/SKILL.md`

⚠️ Task 6에서 `font-system.md / color-palette.md / anti-slop-rules.md`를 **삭제**했다. 이 Task는 남은 스킬의 참조를 Layer 0으로 **교체**하고, Task 6 Step 4의 sweep이 0건이 되도록 보장한다.

- [ ] **Step 1: plugin-visual/SKILL.md — "Resolve paths" 및 "Read 4 reference files" 블록 교체**

현재 SKILL.md의 Resolve paths 블록(대략 L310-335)은 4개 참조 파일을 나열하고 그 중 3개가 삭제된 Layer 0 파일이다. 이를 **삭제된 3개를 신규 4개로 교체**해 총 5개 병렬 Read.

- 제거:
  - `${CLAUDE_PLUGIN_ROOT}/references/design-system/font-system.md`
  - `${CLAUDE_PLUGIN_ROOT}/references/design-system/anti-slop-rules.md`
  - `${CLAUDE_PLUGIN_ROOT}/references/design-system/color-palette.md`
- 추가:
  - `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md`
  - `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md`
  - `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md`
  - `${CLAUDE_PLUGIN_ROOT}/references/design-system/taste-gate.md`
- 유지: `${CLAUDE_PLUGIN_ROOT}/skills/plugin-visual/references/sections-data-schema.md`

"Read 4 reference files" 헤더 문구도 "Read 5 reference files"로 업데이트. 각 파일 설명(1-liner)을 Layer 0 신 파일에 맞춰 교체 (`Semantic tokens`, `Diagram type selection guide`, `Diagram density rules`, `Taste gate checklist`).

aesthetic-rotation CLI 호출 (`Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/aesthetic-rotation.js recent --n 3)`) 은 **그대로 유지** — Task 15는 CLI API를 보존했다.

본문 "Report Generation" 섹션에 Layer 0 강제 로드 문구 추가:
> "Mermaid 생성은 Layer 0의 semantic-tokens.md(토큰) / diagram-type-selection.md(타입 매핑) / diagram-density-rules.md(예산) / taste-gate.md(체크리스트)를 강제 로드하고, `scripts/taste-gate.js`로 자동 검증한다."

- [ ] **Step 2-pre: context-health-visual 현재 구조 확인 (필수 선행)**

작업 전에 SKILL.md를 반드시 read하여 현재 Reference Files / Resolve paths 블록 형태를 파악한다. plugin-visual과 동일한 "Read N reference files" 패턴인지, 아니면 다른 형태(예: References 섹션 + 개별 Read 호출, Additional Resources bullets)인지 확인.

```bash
wc -l plugins/vision-powers/skills/context-health-visual/SKILL.md
grep -nE "font-system|color-palette|anti-slop|diagram-argumentation|design-system|Reference Files|Resolve paths" plugins/vision-powers/skills/context-health-visual/SKILL.md
```

확인 결과에 따라 Step 2의 분기 선택:
- **A. 기존에 font-system/color-palette/anti-slop 참조 존재** → Step 2 (교체 분기)
- **B. 참조가 아예 없음** → Step 2 (추가 분기)
- **C. Reference 블록 자체가 없는 구조** → Reference Files 섹션을 신설한 뒤 Step 2 (추가 분기) 적용

- [ ] **Step 2: context-health-visual/SKILL.md — Step 2-pre 결과에 따라 분기**

**분기 A (교체)**: plugin-visual Step 1과 동일하게 삭제된 3개 경로를 Layer 0 4개로 치환. "Read N reference files" 숫자도 증가. `${CLAUDE_PLUGIN_ROOT}/references/design-system/` prefix 유지.

**분기 B (추가)**: Reference Files 섹션에 Layer 0 4개 경로만 추가. 삭제 대상 없음.

**분기 C (신설)**: 우선 `## Reference Files` 헤더 추가 후 분기 B와 동일.

공통으로 본문 "Report Generation" 또는 유사 섹션에 Layer 0 강제 로드 문구 추가:
> "Mermaid 생성은 Layer 0의 semantic-tokens.md(토큰) / diagram-type-selection.md(타입 매핑) / diagram-density-rules.md(예산) / taste-gate.md(체크리스트)를 강제 로드하고, `scripts/taste-gate.js`로 자동 검증한다."

- [ ] **Step 3: sweep 재확인**

Task 6의 sweep grep이 **0건** 이어야 한다:

```bash
grep -rEn "font-system\.md|color-palette\.md|anti-slop-rules\.md|diagram-argumentation\.md" plugins/vision-powers/ | grep -v "\.git"
```

Expected: 0건. 나오는 게 있으면 해당 파일에서 Layer 0 경로로 교체.

- [ ] **Step 4: 로컬 테스트**

```bash
claude --plugin-dir ./plugins/vision-powers
# analyze ./plugins/vision-powers
# diagnose environment
```

생성된 HTML에서 Mermaid가 새 Layer 0 토큰으로 렌더되는지 확인. 또한 Read tool 호출이 "file not found"로 깨지지 않는지 확인.

- [ ] **Step 5: Commit**

```bash
git add plugins/vision-powers/skills/plugin-visual/SKILL.md plugins/vision-powers/skills/context-health-visual/SKILL.md
git commit -m "Replace legacy Layer 0 refs (font-system/anti-slop/color-palette) with new Layer 0 files in plugin-visual and context-health-visual"
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

다른 터미널에서 각 스킬 호출 (스펙 §8.1의 "문서 스타일별 평가"를 위해 doc-visual은 최소 3종 문서로 돌린다):

**doc-visual — 스타일별 최소 3종**
- **Spec/Design**: `doc-visual docs/superpowers/specs/2026-04-19-vision-powers-v2-design.md`
- **Plan/RFC style**: `doc-visual docs/superpowers/plans/2026-04-19-vision-powers-v2-implementation.md`
- **Research/Reference style**: `doc-visual docs/reference/gotchas.md` 또는 `docs/release-workflow.md` 또는 research 계열 md 하나

각 산출물에서 확인:
- 섹션 구조가 원문 H1/H2/H3 계층을 보존하는가
- hero diagram 1-2개만 지정되는가
- Mermaid 타입 다양성(전부 flowchart만 나오지 않는가)
- taste-gate 위반으로 skip된 섹션이 있으면 warn 로그 확인

**다른 스킬**
- `visualize diff HEAD` (diff-visual — 신 7섹션 확인)
- `analyze ./plugins/vision-powers` (plugin-visual — Layer 0 Read 5개 파일 성공 확인)
- `diagnose environment` (context-health-visual)

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

### A. Pre-execution (플랜 저자가 실행 시작 전에 확인)

- [x] 모든 Task에 "Files" 블록 (Create/Modify/Delete 구분)
- [x] 모든 Step이 actionable (2-5 min)
- [x] 각 Task 끝에 Commit step
- [x] Layer 0 4개 파일 내용이 스펙 §3과 일치
- [x] doc-visual 파이프라인이 스펙 §4.3과 일치
- [x] diff-visual 다이어트가 스펙 §5.1과 일치 (Phase 5 사전 작업 매핑 표 포함)
- [x] 삭제 대상이 스펙 §7과 일치
- [x] CLAUDE.md 룰 준수: 영어 deliverables, 한국어 플랜, no auto-push, main 머지 전 user 승인
- [x] 기존 CLI API 보존(aesthetic-rotation `recent|record|extract`) + 새 `pick` 추가 (breaking change 방지)
- [x] 기존 assemble-report.js 디렉터리 모델 보존 + 새 JSON 모델 공존
- [x] 삭제된 Layer 0 참조 sweep이 plugin-visual/context-health-visual까지 명시적으로 전파

### B. During execution (Task 실행 중 반드시 확인)

- [ ] `accent-tint → primaryColor fill tint` 매핑 표 줄 포함 (Task 1)
- [ ] `font-system.md | color-palette.md | anti-slop-rules.md | diagram-argumentation.md` sweep grep이 0건 (Task 6 Step 4, Task 18 Step 3)
- [ ] `taste-gate.test.js` 12건 전부 PASS (Task 8 Step 4) — reserved-word 회귀 2건 포함
- [ ] `DENSITY_BUDGETS`가 스펙 §3.3의 차원별 제약(lanes/depth/levels/lifelines/entities)을 각각 별도 필드로 유지 (Task 8 Step 3)
- [ ] `aesthetic-rotation.js recent --n 3` CLI 호출이 기존대로 동작 (Task 15 Step 6)
- [ ] `assemble-report.js`의 디렉터리 모델 무회귀 (기존 diff-visual 스모크 통과, Task 12 Step 8)
- [ ] `templates/diff-visual.html`에 SECTION_8 이상 주석 잔여 0건 (Task 17 Step 5)
- [ ] doc-visual 스모크 3종 문서 (spec/plan/research) 모두 에러 없이 HTML 생성 (Task 22 Step 2)
- [ ] basename에 공백/특수문자 포함된 입력으로도 출력 파일 경로가 sanitize되어 생성 (Task 12 Step 6)
- [ ] doc-visual SKILL.md `argument-hint` / `description` / `allowed-tools`에 XML angle brackets(`<`, `>`) 없음 (Task 13). `[md-file-path]` 형식 사용. skill-creator-pro quality gate 룰 "no XML angle brackets in frontmatter"와 일치.
- [ ] `claude plugin validate .` 통과 시 argument-hint에 YAML sequence syntax(`[a | b]`)로 해석되지 않도록 plain string으로 유지 (Task 22 Step 1)

## Execution

Plan complete. Save 후 execution 방식 사용자 선택:

1. **Subagent-Driven** (권장) — Task별 fresh subagent, 중간 리뷰, 빠른 반복
2. **Inline Execution** — 현재 세션에서 executing-plans로 배치 실행, 체크포인트
