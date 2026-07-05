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
9. **Gradient-clipped text** — `background-clip: text` (decorative gradient/clipped text) in any real `<style>` block or inline `style=` attribute; quoted CSS inside `<pre>`/`<code>` is exempt
10. **Font fallback chain** — any `font-family` that names only web fonts with no generic family (e.g. `font-family: Geist` instead of `Geist, system-ui, sans-serif`); `@font-face`, bare keywords, and `var()`-only chains are exempt

Checks 4–5 mechanize the **Technical** and **Signal** rules above, and 9–10 the **Typography** rule and the anti-slop catalogue, that were previously left to authoring judgment — a request without a gate is a wish.

Items still requiring manual judgment (Remove test, Type fit, accent ≤ 2, lang consistency) should be considered during authoring; they are not yet mechanically enforced.

### `--content-only` (Artifact channel)

`node scripts/artifact-gate.js <path> --content-only` runs only checks 1, 2, 6, 7, 8 (missing images,
raw markdown, anchor hrefs, image alt, placeholder leak). It skips 3–5 and 9–10 — density, palette,
classDef, gradient text, font fallback — because on the Artifact channel the design layer belongs to
the harness's built-in artifact-design skill, not this gate (ADR 0007). Use this mode whenever the
page was authored for `--artifact`; the full check set stays the default for local html output.

## On violation

1. Automated validation fails → fix inline (edit the HTML directly)
2. Still failing after 2 retries → **exclude** that diagram, log a warning + continue
