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
