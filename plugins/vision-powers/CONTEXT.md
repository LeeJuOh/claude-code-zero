# vision-powers

Turns verbose AI output — diffs, plugins, documents, answers — into visual explainer
artifacts a human can grasp at a glance. Each sibling skill owns one input slice
(`diff-visual`, `plugin-visual`, `doc-visual`); they share a design system and gate.

## Language

**Visual artifact**:
An HTML or markdown file that re-presents verbose input as something navigable — TL;DR,
callouts, diagrams, tables, images, structure. The deliverable.
**md and html differ only in rendering medium, not ambition.** Both are fully re-structured,
diagram/visual-rich explainers. html adds CSS design and interactivity (collapsible, tabs);
md uses what it supports (mermaid, tables, blockquote callouts, headings, images). md is
**not** a thin passthrough of the input — passing the source through unre-structured is a failure.
_Avoid_: report, summary (a summary compresses; an artifact re-structures without losing substance).

**Linear dump**:
Verbose prose or markdown read top-to-bottom with no structure — the failure mode the
artifact exists to fix. From the HTML-effectiveness thesis: markdown "flattens" what HTML preserves.

**Explainer scaffolding**:
The structure that makes a linear dump navigable: TL;DR box, collapsible steps, tabbed
snippets, comparison tables, diagrams, margin glossary. The *re-structuring*, applied without dropping content.

**Re-structuring (not compression)**:
The north star. Original substance is preserved byte-for-byte; only the *shape* changes from
flat prose to scaffolding. Compressing a body to a one-line summary is the **cardinal sin** —
it is the flattening the skill is supposed to undo.

**Leverage vs delegation**:
The skill's governing tension. **Delegation** — taste and layout choice — goes to the model,
which does it better than a rigid template. **Leverage** — what the skill adds so output beats
bare model — is four things: design brief, source passthrough, boilerplate, gate. Delegate
100% and the skill is pointless (identical to bare model); fragment too much and it loses to
bare model. The artifact lives on that blade.

**Design brief**:
The `css-patterns` design system offered to the model as a *palette/menu* (reading width,
Korean font, one accent, component options), never as a rigid fill-in template.

**Gate**:
An unattended, mechanical safety net run after authoring — checks data integrity the model
can't be merely *asked* to guarantee (lang consistency, raw-markdown leak, image alt, link
href, accent discipline). A request without a gate is a wish. See [[0002]].

**Slop**:
Landing-page aesthetics inappropriate for explainer docs: glassmorphism, double-bezel cards,
spring/staggered motion, bento grids, forced dark mode, icon libraries. Adding slop is how a
skill makes output *worse* than bare model. Mined from references but explicitly rejected.

**Mode**:
The document's presentation register. Two in v1: **explainer** (teaching/learning prose) and
**structural** (architecture/structure). Sections follow the document mode; overrides are rare exceptions.

## Flagged ambiguities

**"Diagram-rich" vs "don't force diagrams"** — resolved as: use the *right* visual generously
(callouts/quotes/tables for prose, diagrams/SVG for spatial info, charts for data), not "one
diagram per section regardless." The old failure was forcing Mermaid on prose, not having too
many visuals.

## Example dialogue

> **Dev:** doc-visual should just summarize each section so the page is short.
> **Domain:** No — summarizing is the cardinal sin. That's compression, and compression is the
> linear-dump problem turned inward. We re-structure: keep the substance, change the shape to
> explainer scaffolding.
> **Dev:** Then can't we just tell the model "preserve everything, look nice"?
> **Domain:** That's pure delegation — output equals bare model, skill is pointless. The leverage
> is the brief, the passthrough, the boilerplate, and the gate. The gate is the part you can't
> ask for; it's mechanical, because a request without a gate is a wish.
