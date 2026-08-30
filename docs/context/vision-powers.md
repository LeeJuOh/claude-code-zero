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

**Artifact channel**:
Delivery of a **visual artifact** as a published claude.ai page through Claude Code's official
Artifacts feature. **The default for html output on an artifact-capable account** ([[0009]]) —
no longer opt-in; a force-local override returns the **Local** channel when the analytical
charts or zoom/pan only Mermaid provides are needed, and non-capable sessions (API-key / CI /
`disableArtifact`) auto-degrade to Local. On this channel the **design brief** lever is
delegated to the harness's built-in artifact-design skill (native to the page's CSP sandbox);
**source passthrough**, **build-time grounding**, and the **Gate**'s content checks remain the
skill's. Disambiguation: unqualified "artifact" in this repo means the **Visual artifact**
deliverable (the usage throughout [[0002]]/[[0005]]); the official feature is always qualified —
"Artifact channel", "Artifact publish", "claude.ai page". See [[0007]], [[0009]].

**Channel**:
Where a **visual artifact** is rendered and delivered, and which visual identity it carries. Two
values — **Local** (design-system look, Mermaid, saved as a file; the fallback on non-capable
sessions) and **Artifact** (built-in artifact-design look, inline SVG/HTML+CSS, published URL —
see **Artifact channel**). Orthogonal to **Format**: either format can ride either channel.
_Avoid_: mode (that is presentation register — see **Mode**), output type, target.

**Diagram-type selection** vs **Rendering technique**:
Two layers the checkpoint behind [[0009]] pried apart. **Diagram-type selection** is the
channel-agnostic decision of *which* diagram a section needs — the 13-type menu and the "which
case → which diagram" mapping; the durable authoring asset. **Rendering technique** is *how* the
chosen diagram is drawn — **Mermaid** (Local/md only) or **inline SVG / HTML+CSS** (Artifact).
Mermaid is a rendering technique, not the diagram layer itself.
_Avoid_: calling Mermaid "the diagrams"; conflating the choice with the drawing.

**Relational diagram** vs **Analytical chart**:
The line that decides rendering feasibility off the Mermaid runtime. **Relational** — meaning is
connections (flow, tree, hierarchy, sequence); hand-authored inline SVG renders these well, often
better than Mermaid. **Analytical chart** — meaning is position or scale on axes (quadrant,
scatter, xy-chart, timeline); needs coordinate accuracy, is Mermaid-strong, and degrades to a
table on the Artifact channel ([[0009]]).
_Avoid_: graph, plot (both overloaded).

**Readability** vs **Visibility**:
The two axes a report is judged on (the [[0009]] checkpoint kept them distinct). **Readability** —
how it reads *when you read it*: line length, prose preservation, cell density, diagram-text
legibility. **Visibility** — how it reads *when you skim it*: hierarchy, whether the eye lands on
the right element first, whether a diagram lands its point at a glance.
_Avoid_: collapsing the two; "legibility" for Visibility (legibility is one input to Readability).

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
`diff-visual` is **explainer by default** since [[0010]] — it is a **Catch-up**, not a review dashboard.

**Catch-up**:
What `diff-visual` delivers: bringing a reader who does *not* know the system up to the point
where they can judge the change — what was there (Background), what the idea is (Intuition), how
the code realises it (Literate diff), and whether they actually got it (Quiz). Read *before*
review; never states whether the change is good. The axis is "does the reader know this system",
not "who wrote it" — agent-written code is almost always a catch-up case. See [[0010]].
_Avoid_: review, summary, overview.

**Literate diff**:
The Code section of a **Catch-up**: the change walked in *understanding order* as prose with
embedded snippets — not file by file. Snippets are **structured blocks** lifted by extraction
([[0005]]); the model writes only the prose around them. When the change altered dependencies, a
before/after dependency picture precedes the walk, stating facts (new, removed, cyclic) without
verdicts.
_Avoid_: split-diff (that is one structured-block type, not the section), file map.

**Quiz**:
Five medium-difficulty questions at the end of a **Catch-up** that the reader must understand the
change to answer; no gotchas; options length-matched so formatting leaks nothing. A *speed
regulator* — the reader's own rule is "pass before you push or approve". Never a gate ([[0003]]).
_Avoid_: test, exam, checkpoint, gate.

**Diagram grounding**:
Making a diagram's nodes and edges correspond to things that actually exist — the diagram-layer
analogue of **Build-time grounding** for code. Two flavours, split by [[0011]]: **internal
consistency** (a diagram is well-formed within itself) and **real-code grounding** (its nodes name
real code). vision-powers grounds diagrams to real code by *authoring discipline* — the fact-sheet
Name check is extended so every diagram node label and edge endpoint is drawn from the set of names
already tied to a `file:line`. It is **not** gate-enforced: unlike code (extraction) or palette (the
Gate), there is no structured intermediate to check against, because `diff-visual/SKILL.md:33` bans
one. This is the knowing "wish"-grade exception [[0011]] records.
_Avoid_: conflating with **Internal consistency** (that is only the weaker half).

**Internal consistency** (of a diagram):
The one grounding property vision-powers *can* enforce mechanically: every edge endpoint resolves to
a node declared in the same diagram. The **Gate** checks it by parsing the rendered Mermaid — so it
runs on the **Local** channel only (`html + --local`), never on the **Artifact** channel (inline SVG
has no recoverable topology) or md (no gate). Matches archify's `components.has(conn.from)` and
gitdiagram's `unknown_edge_source`/`unknown_edge_target`. It does **not** verify the diagram matches
real code — an internally-consistent diagram of a system that doesn't exist still passes ([[0011]]).
_Avoid_: calling this "topology validation" as if it grounded to code; it is well-formedness only.

**Phantom node**:
A dashed node or edge in a `diff-visual` before/after diagram marking an element that was **removed
or moved**. Rendered as Mermaid `-.->` / `stroke-dasharray` on the Local channel and SVG
`stroke-dasharray` on the Artifact channel. Its caption states the fact only ("removed", "moved to
X") — never a verdict ([[0010]]). From archify's `architecture-delta`.

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
