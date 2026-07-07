---
status: accepted
amends: 0007
---

# 0009 — Artifact-first for capable HTML; diagram-type selection is channel-agnostic, Mermaid is a demoted rendering technique

## Context

A dogfooding checkpoint (2026-07-08) rendered the *same* source document through both
channels of the visual skills and compared them on content, design, readability
(reading), and visibility (skimming): the local design-system report
(`*-doc-visual.html`, Mermaid + CDN) vs the artifact report (`*-doc-visual.artifact.html`,
built-in artifact-design). Findings:

- **Content**: parity. Both preserved every source number/name/quote (no summary-leak).
  The local report's only edge was an *added* §4 quadrant scatter — analysis on top of the
  source table, not higher fidelity.
- **Design / readability / visibility**: the built-in artifact design **won**. Its hero —
  a hand-authored HTML+CSS card tree — read the "4 theses, D is the pick" faster than the
  local Mermaid flowchart, which rendered small inside a large empty figure box. Better
  hierarchy, tighter rhythm, more product-grade.
- **Local's only real advantages**: (1) analytical chart types (quadrant/scatter) that the
  artifact channel degrades to a table, and (2) Mermaid's local infrastructure — zoom/pan,
  PNG export, an offline CDN-free render pipeline.

This **inverts the hypothetical in [[0007]]**, which parked "port the local visual layer
into the sandbox" as **Plan B** *if the built-in design disappointed on domain layouts*. It
did not disappoint — it beat the design-system look. The checkpoint's real lesson: Mermaid
is not the *diagram layer*, it is one *rendering technique*. The durable asset is the
**diagram-type selection intelligence** (`diagram-type-selection.md`'s 13-type menu +
"which case → which diagram" mapping), which is orthogonal to how a chosen diagram is drawn.

## Decision

1. **Diagram-type selection is channel-agnostic.** The 13-type menu and case→diagram
   mapping are the authoring brain and apply on every channel. **Mermaid is reclassified as
   one rendering technique for that brain, not the diagram layer itself.**

2. **HTML output on an artifact-capable account defaults to the Artifact channel** —
   built-in artifact-design rendering (inline SVG / HTML+CSS, no Mermaid), published as an
   artifact. This is the **default, not opt-in**; it flips [[0007]]'s posture where the
   design-system local file was default and `--artifact` was the opt-in.

3. **Mermaid is retained as the fallback rendering**, not retired:
   - **HTML on a non-capable session** (API-key / Bedrock / CI, or `disableArtifact`) →
     design-system + Mermaid, saved locally. This is the auto-degrade landing spot.
   - **MD output (any account)** → design-system + Mermaid fences. (claude.ai's md renderer
     can't draw Mermaid anyway — see [[0007]].)

4. **The density budget already bounds feasibility.** Hand-authored SVG is competitive for
   relational diagrams (flow, tree, sequence, hierarchy) but harder than Mermaid for
   node-heavy auto-layout graphs and precise data charts. The existing ≤9-node / ≤12-arrow
   budget already draws that line; over-budget diagrams split into overview+detail as before.

## Considered options

- **(a) Full Mermaid retirement** — author artifact-style inline SVG even for HTML saved
  locally on non-capable accounts, making Mermaid md-only everywhere. Rejected: it is
  *unverified* that hand-authored offline SVG beats Mermaid for dense auto-layout graphs
  (the checkpoint proved the built-in look in the *artifact viewer*, not hand-rolled SVG in
  a local file); it discards zoom/pan, PNG export, and the offline render pipeline; and the
  risk is asymmetric — if local SVG underperforms, *every* fallback session regresses and
  reverting is expensive.
- **(b) Artifact-first for capable HTML; Mermaid as fallback + md (chosen).** Achieves the
  goal ("keep the selection brain, render in the winning style") on the primary path, while
  leaving a safe, cheap-to-reverse landing spot for the minority of non-capable sessions.
- **Plan B from [[0007]] (prerender Mermaid → SVG into the clean page)** stays **parked**.
  This decision does not need it; it becomes relevant only if diagram-heavy dev docs make
  the fallback's Mermaid-in-clean-page combination worth building.

## Consequences

- **Default output for a capable account changes** from a local HTML file to a published
  artifact URL. User-visible; must be disclosed (README, argument hint, publish-time notice)
  and must still auto-degrade cleanly on non-capable sessions.
- **Flag surface inverts**: `--artifact` becomes redundant on capable HTML, and a new
  *force-local* override is needed for a capable user who wants the analytical charts or
  zoom/pan. Flag naming and the `config.js` default (`artifact: true`) are the levers —
  enumerated as implementation work, not decided here.
- **Scope**: applies to the four skills that have a channel — `doc-visual`, `diff-visual`,
  `context-health-visual`, `plugin-visual`. `fact-check` has no artifact channel yet; making
  the policy uniform requires adding one (tracked as a gap).
- **Analytical charts (quadrant/scatter) and zoom/pan remain local-only advantages.** A
  capable user who needs them reaches for the force-local override. This, plus the already
  documented artifact-channel drops (PNG export, ✎ feedback widget), is the disclosed cost.
- **[[0007]] is amended, not reversed.** Its core stands: the artifact channel delegates
  visual design to the built-in skill, and the CDN rendering pattern is local-only. What
  changes is which channel is the *default* and the reframing of Mermaid as a demoted
  rendering technique rather than a co-equal visual identity.
