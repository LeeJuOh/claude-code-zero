# Artifact Gate — Pre-output Checklist

The checklist that model-authored HTML must pass **before** saving. `scripts/artifact-gate.js` runs the programmatically verifiable items.

## Type fit
- [ ] Does the diagram type match the section's intent? (re-check diagram-type-selection.md)
- [ ] Could a 3-column table convey the same information? → if so, **drop the diagram**

## Remove test
- [ ] Can the reader still understand if one node is removed? → that node is **unnecessary**
- [ ] Do two nodes always travel together? → **merge into one**
- [ ] Is the arrow obvious from layout alone? → **drop the arrow**
- [ ] Does the label already signal via color/shape? → **drop the label**

## Signal
- [ ] accent (focal) ≤ 2?
- [ ] Does the legend cover every type used, with no useless entries?
- [ ] Within the complexity budget (density-rules.md)?

## Technical (parser stability)
- [ ] Opaque mask on arrow labels? (without it, the line passes through the label)
- [ ] No `writing-mode: vertical`?
- [ ] No `rgba()` / `rgb()` in Mermaid classDef? (parser breakage)
- [ ] No `color:` in classDef? (breaks dark mode — use CSS overrides)
- [ ] No `{}[]<>&` in sequenceDiagram message?
- [ ] No `<br/>` in stateDiagram-v2?

## Typography
- [ ] Person/node names = body sans (no mono)?
- [ ] Technical content (ports, URLs, paths, field types) = mono?
- [ ] No JetBrains Mono?

## Automation

`scripts/artifact-gate.js` checks three things programmatically:

1. **Missing images** — `<img src="...">` pointing to nonexistent local files
2. **Raw markdown remnants** — `##`, `**`, ` ``` ` leaked into HTML body (outside `<pre>`/`<code>`/`<script>`/`<style>`)
3. **Mermaid density** — diagrams exceeding per-type complexity budgets (nodes, arrows, lifelines, etc.)

Items requiring manual judgment (Remove test, Type fit) should be considered during authoring.

## On violation

1. Automated validation fails → fix inline (edit the HTML directly)
2. Still failing after 2 retries → **exclude** that diagram, log a warning + continue
