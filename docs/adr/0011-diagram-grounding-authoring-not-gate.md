---
status: accepted
---

# 0011 — Diagram grounding stays authoring discipline; the gate checks only internal consistency, and only on the local channel

## Context

vision-powers grounds *code* by extraction ([[0005]]): a structured block is filled by mechanical
extraction from the source and never retyped, so its facts are correct by construction. The **Gate**
([[0002]]) then catches, mechanically, what authoring can't be trusted to guarantee — the plugin's
governing rule is "a request without a gate is a wish".

Diagrams never got this treatment. In diff-visual the flow and dependency pictures are drawn
freehand by the model, with no verification at any layer. That exposes the exact failure the plugin
otherwise designs against: a wrong diagram teaches a wrong system, the same way a retyped snippet
would.

The reference projects (archify, gitdiagram) close this gap with one shared pipeline: **build a
structured intermediate (node/edge JSON), validate the structure, then render deterministically.**
gitdiagram validates two things off that structure — edge endpoints must resolve to declared node
ids (`graph.ts:145-159`), and `node.path` must exist in a Set built from the real repository file
tree (`graph.ts:41`, `:133-138`). archify validates edges and boundary members against its declared
component Set (`renderers/architecture/render-architecture.mjs`). Because validation happens on the
structure *before* rendering, the rendered output is trusted by construction and never re-parsed.

vision-powers cannot take that pipeline as-is. diff-visual authors the rendered output directly —
`diff-visual/SKILL.md:33` bans templates, intermediate JSON, and agent chains, a deliberate
lightness kept by [[0010]]. Two consequences follow:

1. There is no structured intermediate to validate, and no code-symbol ground-truth Set analogous to
   gitdiagram's file tree. Adopting real mechanical grounding would mean reversing the
   no-intermediate-JSON stance and rebuilding diff-visual as a verify→render pipeline.
2. The Gate can only inspect **rendered output**, after the fact. That works for the local channel,
   whose diagrams are Mermaid text a script can parse. It does not work for the default Artifact
   channel, whose diagrams are inline SVG (bare lines, text, and coordinates with no node/edge
   structure to recover) and whose gate runs `--content-only` with design delegated to the built-in
   artifact-design skill ([[0007]]). md output has no gate at all.

So the honest reach of a mechanical diagram check in this architecture is: internal consistency
only (edge endpoints resolve to declared nodes), and only on `html + --local`.

## Decision

1. **Diagram grounding to real code is authoring discipline, not a gate.** diff-visual's fact-sheet
   Name check (the Verification Checkpoint) is extended: every diagram node label and edge endpoint
   must be drawn from the set of names already grounded to a `file:line` the model actually read.
   Because that set is itself grounded, edges between its members are grounded transitively. This is
   the same class of guarantee as the existing Name check — enforced by authoring, not by a script.
2. **The gate checks internal consistency only, and only where it can.** A new `artifact-gate.js`
   check asserts every edge's endpoints resolve to a node declared in the same diagram, parsing the
   rendered Mermaid. It therefore runs on `html + --local` and nowhere else. It is a bonus safety
   net for the minority path, not the center of the grounding story.
3. **No structured intermediate is introduced.** The verify→render pipeline the reference projects
   use is explicitly not adopted for diff-visual; `SKILL.md:33` and [[0010]]'s lightness stand.

## Considered options

- **Adopt the reference verify→render pipeline (node/edge JSON + validate + deterministic render)** —
  rejected. It delivers real mechanical grounding on every channel, but requires reversing
  no-intermediate-JSON and rebuilding diff-visual into a heavier, pipelined tool, contradicting
  [[0010]]. The gain is disproportionate to a diagram layer that is a small part of the report.
- **Encode a node manifest in HTML comments / data-attributes so the gate can parse and cross-check
  on the Artifact channel** — rejected. It is an intermediate structure in disguise, adds authoring
  burden on every diagram, and still cannot recover topology from inline SVG reliably.
- **Extend the gate to md and the Artifact channel** — rejected for this slice. md has no gate path
  today and inline SVG has no recoverable topology; building either exceeds "lightweight".

## Consequences

- On the default (Artifact) channel and in md, diagram grounding rests entirely on authoring
  discipline — the "wish" grade the plugin's own principle warns about. This is a knowing,
  bounded exception, taken because the alternative costs more than the diagram layer is worth.
- The gate check hardens only `html + --local`, catching dangling edges (which also break the
  Mermaid render) before delivery.
- If diagram correctness later proves to fail in the field on the default channel, the recorded
  fork is where to reopen: the fix is the rejected verify→render pipeline, not a bigger gate.
- doc-visual is out of scope for the authoring extension (it has no fact-sheet step to extend); the
  shared gate check applies to its `html + --local` output for free.
