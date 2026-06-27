# vision-powers

## Why this exists

Claude Code is strong at analysis but flat at expression. Whether terminal text or
markdown, relationships, hierarchies, and proportions are described in words — never
shown. Past a handful of nodes, no amount of prose makes the shape visible.

vision-powers gives Claude visual expression. Diagrams show relationships, structured
sections make output navigable, and both HTML and markdown outputs improve on Claude's
bare output. HTML goes further — interactive, spatial, shareable as a single file. (Two honest
limits today: diagrams render through the Mermaid library loaded from a CDN, so the
first view needs network, and web fonts aren't bundled — outputs carry a system
fallback chain instead. Genuine offline self-containment, the way Kami pre-renders
inline SVG, is a possible future step, not a current guarantee.)
Markdown fits where browsers can't: PR descriptions, chat threads, headless CI.

The thesis behind this plugin echoes what Thariq Shihipar (Anthropic, Claude Code team)
articulated in [The unreasonable effectiveness of HTML](https://thariqs.github.io/html-effectiveness/)
— HTML preserves the spatial, structural, and interactive information that plain text
flattens. vision-powers existed before that essay; the essay validated the direction.

## What it does

Turns verbose AI output — diffs, plugins, documents, answers — into visual explainer
artifacts a human can grasp at a glance. Each sibling skill owns one input slice
(`diff-visual`, `plugin-visual`, `doc-visual`, `context-health-visual`); they share a
design system and gate.

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

**Structured block**:
A scaffolding element that re-presents source *verbatim* in a typed layout — split-diff
(before/after code), annotated-code (code + margin notes), data-model (schema change),
api-endpoint (route contract), file-tree (with change flags). Distinct from a **diagram**
(which *abstracts* relationships) and a **callout** (which the model *writes*): a structured
block's factual content is the source itself, lifted unchanged. It widens the design-brief
menu beyond diagrams to the code/contract layer reviewers actually read. See [[0005]].

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
The `design-system` reference set offered to the model as a *palette/menu* (reading width,
Korean font, one accent, component options), never as a rigid fill-in template.

**Gate**:
An unattended, mechanical safety net run after authoring — checks data integrity the model
can't be merely *asked* to guarantee: raw-markdown leaks, missing or alt-less images, dead
links, the forbidden AI-purple palette, Mermaid `classDef` colour traps, diagram density,
leftover placeholders, gradient-clipped text, and missing font-fallback chains. (Language
consistency and accent-count discipline are still held by authoring guidance, not yet by the
gate.) A request without a gate is a wish. See [[0002]].

**Build-time grounding (true-by-construction)**:
A second flavour of leverage beyond the post-hoc **Gate**. A **structured block** is filled by
*mechanical extraction from the source* (e.g. the exact diff hunk), never retyped by the model —
so its facts (code lines, paths, +/−) are correct *by construction*, not by later checking. The
model contributes only selection and the prose around the block (why, risk, annotation). This is
**Re-structuring** taken to its limit: the substance is not merely preserved, it is lifted
byte-for-byte and never passes through the model's hands. Sharpens, does not replace, the Gate —
which still guards what extraction can't. See [[0005]].

**Slop**:
Landing-page aesthetics inappropriate for explainer docs: glassmorphism, double-bezel cards,
spring/staggered motion, bento grids, forced dark mode, icon libraries, gradient-clipped text.
Adding slop is how a skill makes output *worse* than bare model. Mined from references but
explicitly rejected.

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
