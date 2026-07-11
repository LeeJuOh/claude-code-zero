# Diagram Type Selection

The single source the authoring model **must reference** when mapping section intent → diagram type.

**Channel-agnostic — this is the durable asset.** The section-intent → diagram-**type** mapping below applies on **every** channel; it is the selection intelligence ADR 0009 identifies as the real value. The "Mermaid syntax" column is only *one rendering technique* — it applies to the **local design-system channel** and `--format md` fences (where Mermaid draws). On the **Artifact channel** (the default for capable HTML), the built-in `artifact-design` renderer draws these same diagram *types* as inline SVG / HTML+CSS with no Mermaid at all. Pick the type by section intent first; the channel decides only *how* it's rendered. See `channel-decision.md` and `docs/adr/0009-artifact-first-default-diagram-selection-channel-agnostic.md`.

## 13-type selection guide

| What the section shows | Type | Mermaid syntax |
|---|---|---|
| Components + connections (system overview) | architecture | `flowchart TD` + `subgraph` |
| Decision logic with branches | flowchart | `flowchart` with diamond |
| Time-ordered messages between actors | sequence | `sequenceDiagram` |
| States + transitions + guards | state | `stateDiagram-v2` |
| Entities + fields + relationships | ER | `erDiagram` |
| Events positioned in time | timeline | `timeline` |
| Cross-functional handoffs | swimlane | `flowchart` with per-lane subgraph |
| Two-axis positioning (e.g. impact vs effort) | quadrant | `quadrantChart` |
| Hierarchy by containment / scope | nested | `flowchart` with nested subgraph |
| Parent → children relationships | tree | `flowchart TD` |
| Stacked abstraction levels | layer stack | `flowchart` with stacked subgraph |
| Overlap between sets | venn | **Mermaid unsupported** → SVG fallback |
| Ranked hierarchy / funnel / conversion | pyramid | **Mermaid unsupported** → Chart.js bar fallback |

## Fallback (Mermaid-unsupported types)

- **venn**: inline SVG 3-circle overlap (max 3 circles)
- **pyramid**: Chart.js `type: 'bar'`, `indexAxis: 'y'`, descending sort

## Rules of thumb

1. If a 3-column table conveys the same information at least as well, **choose the table** and drop the diagram
2. To merge two types, keep only the dominant axis. No hybrids
3. When over the complexity budget (density-rules.md), split into 2 diagrams: overview + detail
4. Do not turn simple lists into diagrams — keep them as bullets
5. Use sequence only for conversational message flows. Do not substitute flowchart

## Mapping priority

Match against section headers and body keywords. Interpret these semantically and match equivalents in the source document's language.

- "architecture", "components" → architecture
- "flow", "steps" → flowchart
- "sequence", "handshake", "protocol" → sequence
- "state", "transition" → state
- "entities", "schema", "data model" → ER
- "timeline", "history" → timeline
- "lanes", "responsibilities", "roles" → swimlane
- "priority", "effort", "impact", "matrix" → quadrant
- "hierarchy", "nested" → nested
- "tree", "parent-child" → tree
- "layers", "stack" → layer stack
- "overlap", "intersection" → venn
- "funnel", "conversion" → pyramid

## Skill hints

| Skill | Most likely patterns |
|---|---|
| `doc-visual` | All types possible — depends on the source document's topic |
| `diff-visual` | architecture, tree (file map), pyramid (change classification), quadrant (hot spots) |
| `plugin-visual` | architecture (component map), sequence (invocation flow), tree |
| `context-health-visual` | quadrant (skill density vs trigger collisions), timeline |
