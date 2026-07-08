---
name: doc-visual
description: |
  Convert any markdown document into a diagram-enriched visual HTML report.
  Use when asked to visualize, illustrate, or create a visual report from a document with diagrams. Single md file input.
  Also trigger when: "make this document visual", "add diagrams to this doc", "turn this markdown into a report",
  "visualize this README/ADR/spec", or any request to render a document with embedded diagrams.
argument-hint: "[md-file-path] [--format html|md] [--lang code] [--artifact (native design + publish)]"
allowed-tools: Read, Bash(node *), Bash(open *), Bash(rm -rf /tmp/doc-visual-*), Artifact, Skill(artifact-design), AskUserQuestion
---

# doc-visual

Read a markdown document and write a visual report with diagrams that match each section's meaning. Output is HTML (default) or markdown. You write the output directly — no templates, no intermediate JSON, no agent chains.

## Why this matters

The previous version of this skill passed text through a pipeline of agents — each one only saw the output of the stage before it. By the time the report was assembled, the original content had been compressed into summaries of summaries. That's the failure mode you're replacing. You see the original document in full. That's the core advantage. If you find yourself writing "this section discusses X" instead of explaining X — that's compression, and it's the exact failure this redesign exists to fix.

## Input

Argument = single markdown file path. Directories, URLs, stdin not supported.

1. Validate file exists + markdown extension (`.md`, `.markdown`, `.txt`)
2. Missing/no permission → abort immediately
3. Read the full file content

### Format detection

| Flag | Values | Default |
|---|---|---|
| `--format` | `html` / `md` | `html` |
| `--lang` | ISO code | auto-detected from document |
| `--artifact` | switch | off |

The report language must match the source document's language.

`--artifact` also triggers on natural-language equivalents — "as an artifact", "publish as a link",
"share as a URL" — without the literal flag, in whatever language the user is writing in.

**Config precedence.** Before falling back to the defaults in the table, check stored preferences
once: `node ${CLAUDE_PLUGIN_ROOT}/scripts/config.js get` (prints the config as JSON, or `{}`). A
`default_format` value replaces the `html` default; `artifact: true` replaces off, the same as the
`--artifact` flag. Anything the user actually says this turn — a literal flag or a natural-language
equivalent — always overrides config; config only fills in when the request is silent on format/channel.

When the target format is `md`, whether you ask before publishing depends on how the request arrived:

- **Both flags typed literally** (`--format md --artifact`, exact tokens): that's a deliberate,
  informed choice — publish the md file as-is, never ask. See "Markdown format — Artifact channel" below.
- **Artifact intent expressed in natural language** (no literal `--artifact` token) while the target
  format is `md`: check the md content for a ` ```mermaid ` fenced block first. None found → publish
  as-is, same as the explicit path (nothing would be lost either way, so there's nothing to ask
  about). Found one or more → the natural-language phrasing never committed to losing diagram
  rendering, so ask once before publishing (see "Markdown format — Artifact channel").

## Writing the report

You write the output yourself. No template files, no assembly scripts, no intermediate formats.

### HTML format (default)

A self-contained single file — `<!DOCTYPE html>` to `</html>`:
- Inline `<style>` block with all CSS
- Inline `<script>` for Mermaid CDN import and initialization
- Semantic HTML structure: sections that follow the source document's structure
- Diagrams embedded as `<pre class="mermaid">` blocks

### HTML format — Artifact channel (`--artifact`)

Same content decisions (modes, section-to-diagram mapping, component menu, anti-slop-tells) as the
default HTML format — only the page's shape and delivery mechanism change, because the page ships
inside Claude Code's official Artifacts feature instead of as a local file.

**Before writing anything**, load the built-in `artifact-design` skill (Skill tool, skill name
`artifact-design`). This is a tool contract MUST, not a suggestion — it's what conditions the model
for the CSP sandbox this page will run in, and skipping it is how a page ends up broken on publish.

Then write the page as a **fragment**, not a full document:
- No `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags — content only, starting from your first real
  element. The Artifact tool wraps the file in that skeleton at publish time.
- Set a concise `<title>` directly in the content — it names the artifact in the browser tab. Keep
  it stable across every republish of the same document in this session.
- **Zero external requests** — the Artifact viewer's CSP blocks all of them. No Mermaid CDN
  `<script>`, no Google Fonts `<link>`, no hotlinked images. Diagrams that would normally be
  `<pre class="mermaid">` become inline SVG or HTML+CSS layouts instead (follow the artifact-design
  skill's guidance on this) — same diagram-type decision from `diagram-type-selection.md`, different
  rendering technique. `mermaid-patterns.md`'s CDN setup and `classDef` rules don't apply here.
- Support both themes: `@media (prefers-color-scheme: dark)` as the default signal, plus
  `:root[data-theme="dark"]` / `:root[data-theme="light"]` overrides — the artifact viewer's theme
  toggle stamps `data-theme` on the root and it must win in both directions.

Save the fragment to `${CLAUDE_PLUGIN_DATA}/reports/{doc-basename}-doc-visual.artifact.html` — a
distinct filename from the default channel's output, so the two never collide or overwrite each
other for the same source document.

Re-running this skill on the same input within the same conversation reuses that same path.
Publishing to the same `file_path` again redeploys to the same URL instead of minting a new one, so
keep the `<title>` and `favicon` identical across those republishes (the tool reads a changed
favicon as a different page). If `${output-path}.artifact.json` already exists from an earlier
publish this session, read it first and reuse its `title`/`favicon` verbatim rather than choosing
new ones.

### Markdown format (`--format md`)

Insert directly into the response body, and save the same content to
`${CLAUDE_PLUGIN_DATA}/reports/{doc-basename}-doc-visual.md` — the chat text is the delivery, the
file is the record that lets report-manager list and refine this report later:
- Mermaid diagrams as fenced ` ```mermaid ` blocks
- Footer links to the source path
- No CSS, no `<script>` — pure markdown

### Markdown format — Artifact channel (`--format md --artifact`)

Write the same content as the default markdown path above — same structure, same fenced
` ```mermaid ` blocks, nothing rewritten for the channel. There's no CSS or script to break under
the Artifact viewer's CSP, so unlike the HTML channel this variant needs no fragment rewrite, no
built-in artifact-design skill load, and no content-only gate — the md content is already correct
by the same standard the default md path holds itself to.

The one channel-specific fact to act on: **claude.ai's markdown renderer does not render Mermaid**
(confirmed by a direct publish-and-view test, 2026-07-05) — a `mermaid` fence displays as a plain
monospace code block, not a diagram. Decide what to do about that using the branch from "Format
detection" above:

- **Explicit** (`--format md --artifact` typed literally): publish as-is, never ask. If the content
  has any Mermaid blocks, add one line next to the URL noting they'll show as code, with the
  rendered-diagram alternative — e.g. "Diagrams appear as code on this channel — for rendered
  diagrams, use `--format html --artifact`" (in whatever language you're already replying in).
- **Ambiguous** (natural-language artifact intent, target format `md`) **and no Mermaid present**:
  publish as-is, same as explicit — there's no diagram fidelity at stake, so nothing to ask about.
- **Ambiguous and Mermaid is present**: ask once with `AskUserQuestion` before publishing anything:
  1. Regenerate as `--format html --artifact` (diagrams render — recommended)
  2. Publish the md as-is (diagrams show as code)
  3. Keep it local (no publish)

  Act on whichever the user picks. Don't ask again in the same conversation once they've answered.

Publish steps: save the md content to
`${CLAUDE_PLUGIN_DATA}/reports/{doc-basename}-doc-visual.artifact.md` (reuse the same path on a
same-session re-run, same as the HTML variant), then follow "Publish (`--artifact`)" below — the
Artifact tool call, sidecar write, and fallback behavior are identical regardless of format.

### Modes

Decide which mode fits the source document:

| Mode | When | Diagrams | Text depth |
|---|---|---|---|
| **explainer** | Tutorials, guides, narrative docs | Illustrate concepts | Full prose — preserve all substance |
| **structural** | ADRs, specs, API docs, config references | Map relationships | Structured — tables, definition lists, code blocks |

If the document mixes both (e.g., a spec with a narrative intro), use structural as the base and apply explainer treatment to narrative sections.

### Section-to-diagram mapping

For each section in the source document, decide whether a diagram adds value. Not every section needs one — if a table or list says it better, use that.

Read `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md` to choose the right type from the 13-type menu. The mapping priority section tells you which keywords suggest which types.

When no diagram fits, skip it. A section with good prose and no diagram beats a section with a forced diagram.

### Component menu

These are the building blocks. Mix them as the content demands:

| Component | When to use |
|---|---|
| **Mermaid diagram** | Relationships, flows, hierarchies — when connections are the point |
| **Table** | Comparisons, specs, 2-3 column data |
| **Code block** | Configs, commands, API examples |
| **Prose paragraph** | Narrative explanation, context, reasoning |
| **Definition list** | Term → meaning pairs |
| **Callout box** | Warnings, tips, important notes |

### Diagram rules

Read these reference files for implementation details — don't memorize them, read them each time:

- `${CLAUDE_PLUGIN_ROOT}/references/design-system/mermaid-patterns.md` — Complete Mermaid syntax reference, theming, dark mode, zoom controls. This is the implementation bible — 13 type examples, classDef rules, CDN setup
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md` — Color/font roles and Mermaid themeVariables mapping
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md` — Complexity budgets per type

Key rules (always apply, no need to look up):

1. **Density**: Max 9 nodes, 12 arrows per diagram. Over budget → split into overview + detail
2. **Accent**: 1-2 focal elements only. 4+ accents = redesign needed
3. **No rgba() in Mermaid classDef** — parser breaks. Use 8-digit hex `#RRGGBBAA`
4. **No `color:` in classDef** — breaks parser. Style text via themeVariables only
5. **Theme**: Always `theme: 'base'` with themeVariables from semantic-tokens
6. **Palette**: No violet/fuchsia "AI purple" hexes (`#8b5cf6`/`#7c3aed`/`#a78bfa`/`#d946ef`) — the gate fails on these
7. **Table vs diagram**: If a 3-column table conveys it equally well, use the table

The gate also fails on dead links, alt-less images, and leftover scaffolding: give every `<a>` a real href, every `<img>` an `alt` (`alt=""` if decorative), and leave no `{{ }}`/lorem/`[STUB]` placeholders. It also fails on `background-clip: text` (gradient-clipped text — decorative slop) and on any `font-family` without a generic fallback, so end every stack with a system family (`…, sans-serif`).

### CSS essentials

You write your own CSS inline. These constraints matter:

- **Font stacks**: Always end every `font-family` with a system fallback chain (e.g. `Geist, system-ui, -apple-system, sans-serif`) — the web fonts aren't bundled, so a bare family name silently drops to a browser default offline. See semantic-tokens.md for the per-role chains. Include a CJK font when the document might be Korean
- **Dark mode**: Support `prefers-color-scheme: dark` via CSS custom properties. Map semantic roles (paper, ink, muted, accent) to both schemes
- **Mermaid scaling**: Use `transform: scale()` for zoom — preserves vector quality. Never `zoom` property
- **Overflow protection**: `min-width: 0` on flex/grid children
- **Code blocks**: `white-space: pre; overflow-x: auto`
- **Status indicators**: Colored dots via CSS, no emoji
- **Animations**: Respect `prefers-reduced-motion: reduce`

### Content integrity — the cardinal rule

The source document's substance must survive intact in the report. This means:

- **Specific numbers, names, dates** from the source → appear in the report
- **Technical details** (configs, commands, parameters) → preserved verbatim
- **Reasoning and nuance** → kept, not flattened to bullet points
- **Code examples** → reproduced in full

If you're writing "this section covers X" or "the document describes Y" — stop. That's a summary of the content, not the content. Include the actual content.

This cardinal rule (call it *summary-leak*) is one of seven authoring reflexes that pass every mechanical gate and still flatten the output. Read `${CLAUDE_PLUGIN_ROOT}/references/design-system/anti-slop-tells.md` for the full catalogue — linear dump, forced diagram, generic label, uniform density, empty decoration, accent overuse. They're named defaults to break, not design rules: layout and taste stay yours, the catalogue just flags the habits worth resisting.

Short documents (<500 chars) get 1 section + 1 hero diagram. Long documents get proper sectioning but still preserve all substance.

## Validation (HTML only)

After writing the HTML file, run artifact-gate:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-gate.js <output-html-path>
```

It checks, in this order:
1. **Missing images** — any `<img src="...">` pointing to nonexistent local files
2. **Raw markdown remnants** — `##`, `**`, ` ``` ` leaked into HTML body
3. **Mermaid density** — diagrams exceeding complexity budgets
4. **Mermaid classDef colour traps** — `rgb()/rgba()` (parser break) or `color:` (dark-mode break) in a classDef
5. **Forbidden palette** — violet/fuchsia "AI purple" hexes banned by semantic-tokens.md
6. **Anchor href integrity** — `<a>` with no/empty/`#` href (pure id/name jump targets are exempt)
7. **Image alt** — `<img>` missing an alt attribute (`alt=""` for decorative images is allowed)
8. **Placeholder leak** — unfilled `{{ … }}`, lorem ipsum, or bracketed stubs left in the body

If violations found: fix them inline (re-edit the HTML). Max 2 retry cycles. If still failing after 2 fixes, remove the offending element and log a warning.

**Under `--artifact`**, run the gate in content-only mode instead:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-gate.js <output-html-path> --content-only
```

This runs only checks 1, 2, 6, 7, 8 above (missing images, raw markdown, anchor hrefs, image alt,
placeholders) — the facts that must survive regardless of who designed the page. Checks 3–5 (density,
classDef, palette) don't apply: the built-in artifact-design skill owns the design layer on this
channel (ADR 0007), and there's no Mermaid to check density on in the first place.

## Visual self-audit (HTML only)

The gate reads the HTML as *text* — it never sees the rendered picture. A diagram can pass the density check and still render as an unreadable tangle; a label can clip at the container edge; hierarchy that reads fine in source can collapse into a flat wall once styled. After the gate passes, **render the report and look at it** before delivering:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-report.js <output-html-path>
```

On success it prints a PNG path. **Read that PNG** (you read images multimodally) and scan it for what the text gate can't judge:

- **Density** — is any section a uniform grey wall, or a diagram past its budget and unreadable?
- **Hierarchy** — does anything draw the eye first, or is every section the same weight? (see *uniform density* / *accent overuse* in anti-slop-tells.md)
- **Mermaid integrity** — did a diagram render as raw `<pre>` text or as crossing/overlapping edges?
- **Overflow** — does a diagram, table, or label run past its container or off the page?

Fix what you see and re-render. **Cap at 2 audit passes** — if something still looks off after the second, ship with a one-line note to the user rather than looping. This catches gross breakage, not pixel-perfection.

**If Chrome is absent**, `render-report.js` exits `1` (non-zero). Skip the audit and tell the user it was skipped (e.g. "rendered-image check skipped: Chrome not found — set `CHROME_BIN` or install Chrome"). The report already passed the gate; the visual pass is an enhancement and **never blocks delivery**.

Full procedure, limits (fixed-height clipping, downscaling, render cost), and the rationale for *not* mechanizing this with a measurement script live in `${CLAUDE_PLUGIN_ROOT}/references/design-system/visual-self-audit.md`.

**Skip this entirely under `--artifact`.** The rendered picture is the built-in artifact-design
skill's responsibility on this channel, not this skill's — there's no local Chrome render loop to
run before publishing.

## Output

- **HTML**: Save to `${CLAUDE_PLUGIN_DATA}/reports/{doc-basename}-doc-visual.html`. Run `open <output-path>` after completion.
- **MD**: Insert directly into the response body and save a copy to `${CLAUDE_PLUGIN_DATA}/reports/{doc-basename}-doc-visual.md`. Footer links to the source path.
- **`--artifact`**: see "Publish (`--artifact`)" below.

## Publish (`--artifact`)

For `--format html`, do this after the content-only gate passes. For `--format md`, there's no gate
to wait on — go straight to publishing once the branch in "Markdown format — Artifact channel" above
resolved to "publish."

1. Publish with the `Artifact` tool: `file_path` = the file you saved (the html fragment or the md
   file), `favicon` = one or two emoji fitting the document's topic (reused unchanged if a sidecar
   from this session already set one — see above), `description` = one sentence on what the page is.
2. Record the publish so a later refine (even across sessions, once that lands) can find this URL:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/write-artifact-sidecar.js --report <output-path> --url <artifact-url> --title <title> --favicon <favicon>
   ```
3. Report the URL to the user with one line:
   - **html**: note the design delegation, e.g. "Design delegated to Claude's built-in Artifact
     renderer — this differs from the local report's look."
   - **md**: only if the content has Mermaid blocks, note they show as code (see "Markdown format —
     Artifact channel" above for the exact wording). No diagrams → no extra line needed.

   Phrase whichever applies in whatever language you're already replying in.

**Fallback** — if the `Artifact` tool is unavailable or the publish call fails, don't guess at the
specific cause and don't ask before falling back:
- **html**: keep the local fragment you already saved, `open` it as the default HTML channel does,
  and state the fallback in one generic line (e.g. "Artifact publish unavailable — opened the local
  file instead.").
- **md**: deliver the content the normal way instead — insert it directly into the response body (the
  default `--format md` path above) — and state the fallback in one generic line (e.g. "Artifact
  publish unavailable — delivered as chat markdown instead.").

## Error handling

| Failure | Action |
|---|---|
| File missing/no permission | Abort with message |
| Empty file | Abort — nothing to visualize |
| No headings (H1/H2/H3) | Treat as single section |
| `--artifact` (html): Artifact tool unavailable or publish fails | Fall back to local file + open it + one-line reason, don't ask |
| `--artifact` (md): Artifact tool unavailable or publish fails | Fall back to chat-inserted markdown + one-line reason, don't ask |
| Mermaid syntax error after 2 fixes | Remove that diagram, keep section prose |

## Reference files

Read these during report generation (not upfront — read the relevant one when you need it):

| File | When to read |
|---|---|
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/mermaid-patterns.md` | Before writing any Mermaid diagram |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md` | When setting up CSS custom properties and Mermaid theme |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md` | When deciding diagram type for a section |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md` | When a diagram feels complex |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/anti-slop-tells.md` | While shaping content — to check you're not falling into a behavioral-slop reflex |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/visual-self-audit.md` | After the gate passes — the render-and-look loop (full procedure) |
