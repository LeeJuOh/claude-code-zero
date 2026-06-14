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
- [ ] Mono confined to technical spans, never the body font?

## Automation

`scripts/artifact-gate.js` checks these programmatically:

1. **Missing images** — `<img src="...">` pointing to nonexistent local files
2. **Raw markdown remnants** — `##`, `**`, ` ``` ` leaked into HTML body (outside `<pre>`/`<code>`/`<script>`/`<style>`)
3. **Mermaid density** — diagrams exceeding per-type complexity budgets (nodes, arrows, lifelines, etc.)
4. **Mermaid classDef colour traps** — `rgb()`/`rgba()` (parser breakage) or `color:` (dark-mode breakage) inside a classDef
5. **Forbidden palette** — the violet/fuchsia "AI purple" hexes banned above (`#8b5cf6`, `#7c3aed`, `#a78bfa`, `#d946ef`)
6. **Anchor href integrity** — `<a>` with missing/empty/`#` href (pure `id`/`name` jump targets exempt)
7. **Image alt** — `<img>` missing an `alt` attribute (`alt=""` for decorative images is allowed)
8. **Placeholder leak** — unfilled `{{ … }}`, lorem ipsum, or bracketed stubs (`[YOUR NAME]`, `[TODO]`) left in the body

Checks 4–5 mechanize the **Technical** and **Signal** rules above that were previously left to authoring judgment — a request without a gate is a wish.

Items still requiring manual judgment (Remove test, Type fit, accent ≤ 2, lang consistency) should be considered during authoring; they are not yet mechanically enforced.

## On violation

1. Automated validation fails → fix inline (edit the HTML directly)
2. Still failing after 2 retries → **exclude** that diagram, log a warning + continue
