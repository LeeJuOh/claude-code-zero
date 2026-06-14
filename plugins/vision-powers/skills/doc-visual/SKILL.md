---
name: doc-visual
description: |
  Convert any markdown document into a diagram-enriched visual HTML report.
  Use when asked to visualize, illustrate, or create a visual report from a document with diagrams. Single md file input.
  Also trigger when: "make this document visual", "add diagrams to this doc", "turn this markdown into a report",
  "visualize this README/ADR/spec", or any request to render a document with embedded diagrams.
argument-hint: "[md-file-path] [--format html|md] [--lang code]"
allowed-tools: Read, Bash(node *), Bash(open *), Bash(rm -rf /tmp/doc-visual-*)
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

The report language must match the source document's language.

## Writing the report

You write the output yourself. No template files, no assembly scripts, no intermediate formats.

### HTML format (default)

A self-contained single file — `<!DOCTYPE html>` to `</html>`:
- Inline `<style>` block with all CSS
- Inline `<script>` for Mermaid CDN import and initialization
- Semantic HTML structure: sections that follow the source document's structure
- Diagrams embedded as `<pre class="mermaid">` blocks

### Markdown format (`--format md`)

Insert directly into the response body (no file save):
- Mermaid diagrams as fenced ` ```mermaid ` blocks
- Footer links to the source path
- No CSS, no `<script>` — pure markdown

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

The gate also fails on dead links, alt-less images, and leftover scaffolding: give every `<a>` a real href, every `<img>` an `alt` (`alt=""` if decorative), and leave no `{{ }}`/lorem/`[STUB]` placeholders.

### CSS essentials

You write your own CSS inline. These constraints matter:

- **Korean font stack**: Include a CJK font in your font-family (the document might be Korean). Model picks the specific font
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

## Output

- **HTML**: Save to `${CLAUDE_PLUGIN_DATA}/reports/{doc-basename}-doc-visual.html`. Run `open <output-path>` after completion.
- **MD**: Insert directly into the response body. Footer links to the source path.

## Error handling

| Failure | Action |
|---|---|
| File missing/no permission | Abort with message |
| Empty file | Abort — nothing to visualize |
| No headings (H1/H2/H3) | Treat as single section |
| Mermaid syntax error after 2 fixes | Remove that diagram, keep section prose |

## Reference files

Read these during report generation (not upfront — read the relevant one when you need it):

| File | When to read |
|---|---|
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/mermaid-patterns.md` | Before writing any Mermaid diagram |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md` | When setting up CSS custom properties and Mermaid theme |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md` | When deciding diagram type for a section |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md` | When a diagram feels complex |
