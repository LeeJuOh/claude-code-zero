---
status: accepted
---

# 0002 — vision-powers generates artifacts by direct model authoring, not pipelines

## Context

vision-powers turns verbose AI output (diffs, plugins, documents, answers) into visual
explainer artifacts. The thesis it rests on — Thariq Shihipar's *The unreasonable
effectiveness of HTML* — is that HTML **preserves** the spatial, structural, and
interactive information that markdown flattens into a "linear dump."

The family had two generation paths, both pipeline-based:

- **diff-visual / plugin-visual** — gather data → analyze → a `visual-report-writer`
  subagent writes `section-N.html` files freely → `assemble-report.js` stitches them.
- **doc-visual** — a rigid JSON pipeline: `parse-markdown → section-analyzer →
  diagram-generator → taste-gate → assemble-report`. The `diagram-generator` stage emits
  only `{summary, mermaid_code}` and **drops the original body** — it compresses the very
  content the thesis says to preserve, then forces a Mermaid diagram on every section.

The trigger: a grill writeup converted by doc-visual (artifact "B") came out **worse** than
the same writeup an unaided model wrote as one HTML file (artifact "A"). B compressed the
prose to a summary, forced 7 Mermaid diagrams, dropped the source images, and leaked raw
markdown. The skill was a net negative — it actively flattened where the thesis demanded
preservation.

## Decision

~~(Original 2026-06-06: doc-visual only, option A. Siblings deferred as option C.)~~

**Updated 2026-06-06 (grill session 2): all three skills adopt direct model authoring.**
The fragmentation problem is not doc-visual-specific — the `visual-report-writer` subagent
+ `assemble-report.js` pipeline fragments content into per-section slots for all siblings.
The model writes the **whole artifact directly in a single pass** for every skill, conditioned
by each skill's SKILL.md rather than fragmented by a shared pipeline.

Each skill's leverage narrows to what it adds on top of bare model output:

1. **Design brief** — `css-patterns` offered as a palette/menu, not a rigid template.
2. **Source passthrough** — the full input handed to the model intact (no compression stage).
3. **Gate** — an unattended safety net (lang consistency, raw-markdown leak, image alt, link href, accent discipline).

Boilerplate (feedback widget, shared.js, export bar) is removed — not needed when the model
writes directly. Mermaid rendering uses a CDN `<script>` tag the model includes inline.

The shared pipeline infrastructure becomes deletable:

- `assemble-report.js` — no consumers
- `visual-report-writer` agent — no consumers
- `shared/shared.js`, `shared/feedback.css` — no consumers
- `templates/*.html` — no consumers
- `scripts/parse-markdown.js`, `agents/section-analyzer.md`, `agents/diagram-generator.md` — no consumers

## Considered options

- **(A) Direct model authoring for doc-visual only** — original decision. Reproduces
  artifact A, the proven winner. Left siblings on the old pipeline.
- **(B) Align doc-visual to the family** — route doc-visual through `visual-report-writer`.
  Rejected: the writer still fragments into per-section files and slot-filling.
- **(C) Rework all skills to direct model authoring (chosen).** Fixes fragmentation at
  the root across the whole family. Largest change, but the pipeline infrastructure becomes
  dead code once all three skills write directly. Originally deferred; activated when the
  user directed whole-plugin improvement.

## Consequences

- All three skills condition the model via SKILL.md rather than fragmenting via pipeline.
- The shared pipeline (`assemble-report.js`, `visual-report-writer`, `shared/`, `templates/`) can be deleted entirely — no partial-removal ambiguity.
- Direct authoring means full input sits in the writing context for all skills. Token cost increases. Accepted as the cost of preservation.
- Body-loss risk (model silently dropping content) is mitigated by gate + eval, not eliminated. Residual risk accepted.
- diff-visual and plugin-visual are reopened for redesign — they must be re-evaluated against bare model output to confirm the new architecture improves them too.
