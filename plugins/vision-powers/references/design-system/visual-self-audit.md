# Visual Self-Audit — Render, See, Fix

The loop that closes the gap the gate can't reach: render the HTML to an image, **look at it**, and fix what only the eye catches.

## Why this exists

`artifact-gate.js` inspects the HTML **as text** — markup, palette hexes, `classDef` syntax, placeholder leaks. It never sees the *rendered picture*. So a report can pass every mechanical check and still fail visually:

- A Mermaid block is syntactically valid, passes the density check, and renders as an unreadable tangle of crossing edges.
- A diagram overflows its column, or a long label clips at the container edge.
- Section hierarchy that reads fine in source collapses into a flat grey wall once styled.
- A chart's axis labels overlap; a table scrolls off-screen.

None of these are text defects. The Kami principle applies: **if you didn't render it and look, it isn't done.** This audit is that look.

## The loop

Run it after the gate passes, before delivering to the user.

**1. Render.**
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-report.js <report.html>
```
On success it prints one absolute PNG path to stdout (default `$CLAUDE_PLUGIN_DATA/cache/audit-<ts>.png`) and exits `0`.

**2. See.** Read that PNG path. Claude reads images multimodally, so the rendered page comes back as something you can actually evaluate — not as markup.

**3. Check.** Scan the image against this short visual rubric. Each item maps to something the text gate can't judge:

| Look for | Failing when | Tie-in |
|---|---|---|
| **Density** | a section is a uniform grey wall, or a diagram is past its budget and unreadable | `diagram-density-rules.md`; Tell #5 *uniform density* |
| **Hierarchy** | nothing draws the eye first — every section the same weight | Tell #5; Tell #7 *accent overuse* |
| **Mermaid integrity** | a diagram rendered as raw `<pre>` text, or as crossing/overlapping edges | `mermaid-patterns.md` |
| **Overflow / clipping** | a diagram, table, or label runs past its container or off the page edge | — |

**4. Fix and re-render.** Edit the HTML to correct what you saw, then run steps 1–3 again. **Cap at 2 audit passes.** If something still looks wrong after the second pass, ship it with a one-line note to the user about the remaining issue rather than looping forever — this mirrors the gate's "2 retries then continue" discipline in `artifact-gate.md`. The goal is catching gross visual breakage, not pixel-perfection.

## When Chrome is absent

`render-report.js` needs a local Chrome/Chromium. If none is found (or it crashes, or produces no PNG) it exits **`1`** with an install hint. On a non-zero exit, **skip the audit and warn — never block delivery.** The report already passed the gate; the visual pass is an enhancement, not a release gate. Tell the user the audit was skipped and why (e.g. "rendered-image check skipped: Chrome not found — set `CHROME_BIN` or install Chrome to enable it"). `CHROME_BIN` overrides discovery on any platform.

## Why there is no deterministic measurement script

A reasonable instinct is to mechanize this the way Kami does — measure whitespace ratio, count pages, assert margins. **We deliberately do not**, for two reasons:

1. **HTML has no fixed canvas.** Kami pre-renders to a known page geometry; a vision-powers report is fluid HTML whose height depends on content and whose `render-report.js` "page size" is just a viewport argument, not a real page. "Margin %" and "page count" have no stable definition here, so any number a script produced would be measuring the screenshot window, not the design.
2. **It would violate delegation.** Mechanizing a *design* judgment — "this has the right whitespace," "the hierarchy is correct" — is exactly the leverage-vs-delegation line this plugin draws. Taste stays with the model. This audit gives the model *eyes* (a rendered image to react to); it does not give a script a *ruler* to grade design with. The model looks and decides, the same way a person would.

So the audit is intentionally a **judgment loop, not a metric.** The rubric above is a prompt for the eye, not a checklist a script evaluates.

## Known limits

- **Fixed-height capture.** `render-report.js` screenshots a fixed window (default `--height 8000`), not a true full-page capture. A report taller than the height clips at the bottom — content past the cut never appears in the PNG, so the audit can't see it. For a long report, pass a larger `--height`, or render and read it in segments. (8000px covers most reports; very long ones are the exception to watch.)
- **Downscaling.** A single tall PNG may be downscaled when read, so fine type can blur. The audit reliably catches *gross* breakage (tangled diagrams, overflow, flat hierarchy); it is not a proofreading pass for small text.
- **Cost.** Each render spawns Chrome and waits `--wait` (default 12000ms) for the Mermaid CDN to load and render. Two audit passes mean two such renders. For a quick visual check on a report with no diagrams, pass a smaller `--wait` (e.g. `--wait 3000`) to cut the spawn time.
