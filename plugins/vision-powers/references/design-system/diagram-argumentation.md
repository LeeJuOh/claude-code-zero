# Diagram Argumentation

How to design Mermaid diagrams that teach. Paired with `mermaid-patterns.md` (syntax/theme) and `anti-slop-rules.md` (Generic Labels). This file covers *what the diagram should argue*; the others cover *how it's rendered*.

---

## Core Principle: ARGUE, not DISPLAY

A diagram is not formatted text. It's a visual argument that shows relationships, causality, and flow that prose cannot express.

**The Isomorphism Test:** If you removed every text label, would the structure alone still communicate the concept? If the answer is no, the structure is decorative — redesign.

**The Education Test:** Could a reader learn something concrete from this diagram, or does it just label boxes? A good diagram *teaches* — it shows real identifiers, actual counts, concrete examples.

A diagram that fails both tests is filler. Better to cut it than ship it.

---

## Evidence Artifacts (Required for Technical Diagrams)

Technical diagrams in vision-powers reports must carry **evidence** — real names and values, not placeholders. The `anti-slop-rules.md` Generic Labels rule is the floor; this section raises the ceiling.

| Artifact | When to Use | Example |
|---|---|---|
| Real function / module names | Architecture, dependency graphs | `src/payments/stripe.js` not "Payment module" |
| Real event / message names | Protocols, sequence diagrams | `RUN_STARTED`, `STATE_DELTA` not "Event 1", "Event 2" |
| Real API routes | Request-response flows | `POST /checkout` not "Endpoint" |
| Actual counts | Component maps, dashboards | `Skills (7)`, `Hooks (3)` not "Multiple skills" |
| Concrete file paths | Diff, plan, recap diagrams | `.claude-plugin/marketplace.json` not "Manifest" |
| Sample shapes | Data flows | `{ user_id, amount, status }` not "Payload" |

**Rule:** Before rendering any technical diagram, verify every node label is either a real identifier from the source, or a concrete category (Phase 1, User, System) justified by the abstraction level.

If you cannot source a label from the actual code/git/plugin, either derive it from `source_context` paths or drop the node — never invent generic filler.

---

## Multi-Zoom Architecture

Comprehensive diagrams in vision-powers reports often need multiple zoom levels simultaneously, like a map that shows country borders *and* street names.

### Level 1 — Summary Flow
A simplified overview showing the whole pipeline at a glance. Place near the top of the section or diagram.

*Example for a diff-visual overview:* `Parse diff → Classify changes → Render report`

### Level 2 — Section Boundaries
Labeled regions (Mermaid `subgraph`) grouping related components. Creates visual "rooms" that show what belongs together.

*Example for an agent-extension-visual architecture diagram:*
```
subgraph Skills
  SkillA
  SkillB
end
subgraph Agents
  AgentA
end
```

### Level 3 — Detail
Concrete identifiers, counts, and evidence inside each section. This is where the educational value lives — the "street names" of the map.

*Example:* Inside the `Skills` subgraph, nodes are labeled with actual skill names + their trigger contexts, not just generic "Skill 1", "Skill 2".

**For comprehensive diagrams, aim to include all three levels.** A diagram that only hits Level 1 is an infographic; only Level 3 is a wall of names. The combination is what teaches.

When a diagram would require all three levels but the section is short, split: one Level 1 diagram for overview, a separate Level 3 diagram for detail.

---

## Pattern Map (Concept → Mermaid)

Each concept has a visual pattern that mirrors its behavior. Pick the pattern that matches the argument, not a default tree.

| Concept | Pattern | Mermaid shape |
|---|---|---|
| One source, many outputs | **Fan-out** | `graph TD; S --> A; S --> B; S --> C` — central node with multiple outgoing edges |
| Many sources, one output | **Convergence** | `graph TD; A --> T; B --> T; C --> T` — edges merging into a single target |
| Sequence of steps in time | **Timeline** | `graph LR; A --> B --> C --> D` — linear, left-to-right |
| Hierarchical nesting | **Tree** | `graph TD` with layered parent→children |
| Feedback loop | **Cycle** | `graph LR; A --> B --> C --> A` — arrows returning to the start |
| Before / after comparison | **Side-by-side** | two `subgraph` blocks labeled Before / After |
| Phased separation | **Gap/break** | `subgraph` blocks with thick `==>` connectors between phases |
| Request / response | **Sequence** | `sequenceDiagram` with participants and messages |
| Decision / routing | **Diamond** | `{Decision?} -->|yes| A` vs `-->|no| B` |
| Data model | **ER** | `erDiagram` for entity relationships |
| State machine | **State** | `stateDiagram-v2` (but see Gotchas in `mermaid-patterns.md`) |

**Variety rule:** In a report with several diagrams, avoid repeating the same pattern. If every section shows a top-down flowchart, the report reads as uniform — the patterns should vary to match the concept of each section.

### Pattern → vision-powers skill hints

| Skill | Most likely patterns |
|---|---|
| `diff-visual` | Architecture impact = Tree + Fan-out (new modules); Housekeeping = side-by-side for before/after; Decisions = timeline |
| `plan-visual` | Blast radius = Fan-out from plan node; Risk = convergence; Steps = timeline |
| `project-recap` | Activity = timeline; Decisions = fan-out from key commits; Cognitive debt = tree |
| `agent-extension-visualizing` | Component map = tree with subgraphs; Flow of invocation = sequence |

These are starting points, not rules. Pick the pattern that fits the actual data.

---

## Building Large Diagrams

A single Mermaid diagram with 20+ nodes gets unreadable fast. Two rules:

### Cap size
Keep individual diagrams under **15–20 nodes**. Beyond that, split into multiple diagrams or use `subgraph` groupings.

### Section-by-section authoring
When a diagram truly needs many sections, build it in passes rather than one monolithic output:

1. **Sketch the sections first** — identify which subgraphs the diagram will have and what each argues. Write them down before any Mermaid code.
2. **Author each section's nodes and internal edges** — get one subgraph complete before starting the next.
3. **Wire cross-section edges last** — after every subgraph has its internal structure, add the edges that connect across them.
4. **Review the whole** — read the full diagram source and check: are cross-section edges pointing at nodes that actually exist? Is spacing balanced via subgraph titles and ordering? Are IDs globally unique?

Don't generate the whole diagram in a single dense block and hope the layout works. Mermaid's layout engine produces better results when nodes have meaningful groupings, and you catch collisions earlier.

---

## Checklist (run before finalizing any diagram)

| # | Check |
|---|---|
| 1 | **Isomorphism** — strip the labels mentally; does the shape still carry the concept? |
| 2 | **Education** — would a reader learn a concrete fact from this diagram? |
| 3 | **Evidence** — every technical node has a real name / path / count (or is a justified abstract role) |
| 4 | **No generic labels** — no `Component`, `Data`, `API`, `Service` standing alone (see `anti-slop-rules.md`) |
| 5 | **Pattern match** — the visual pattern mirrors the concept (fan-out for sources, convergence for aggregation, etc.) |
| 6 | **Variety** — no two diagrams in the same report use identical patterns |
| 7 | **Multi-zoom** — complex diagrams hit summary + sections + detail; simple ones hit at least one level cleanly |
| 8 | **Size** — under ~20 nodes; if more, split with `subgraph` or into multiple diagrams |
| 9 | **Cross-references** — `click NodeId "#section-id"` targets that actually exist |
| 10 | **Syntax safety** — no `rgba()` / `color:` in classDef, no `<br/>` in stateDiagram, no `{}[]<>&` in sequenceDiagram messages (enforced by `validate-report.js`) |

If any of checks 1–8 fail, redesign before rendering. Checks 9–10 are caught by validators but are cheaper to avoid upfront.
