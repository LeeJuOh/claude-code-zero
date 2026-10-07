---
name: doc-visual
description: >
  Turn a markdown document (README, spec, ADR, design doc, research note) into a visual report with
  diagrams matched to each section. Use when asked to visualize, illustrate, or add diagrams to a
  document, or to turn markdown into a report. Takes one md file.
argument-hint: "[md-file-path] [--format html|md] [--lang code] [--local (force a local file instead of publishing)]"
allowed-tools: Read, Bash(node *), Bash(open *), Bash(rm -rf /tmp/doc-visual-*), Artifact, Skill(artifact-design), AskUserQuestion
---

# doc-visual

Read a markdown document and write a visual report with diagrams that match each section's meaning. Output is HTML (default) or markdown. You write the output directly — no templates, no intermediate JSON, no agent chains.

## Why this matters

A pipeline of agents that each see only the previous stage's output compresses the content into summaries of summaries. You see the original document in full — that's the core advantage. If you find yourself writing "this section discusses X" instead of explaining X, that's compression, and it's the failure this skill exists to prevent.

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
| `--local` | switch | off — capable HTML **publishes to an Artifact by default** |
| `--artifact` | switch | retained no-op alias (already the default on capable HTML) |

The report language must match the source document's language.

**Channel, flags, and config** follow `${CLAUDE_PLUGIN_ROOT}/references/design-system/channel-decision.md`
— read it before writing. In short: capable HTML publishes to a claude.ai Artifact; `--local` (or
"keep it local", "don't publish") forces the local file; `md` stays local unless this turn asks to
publish it. Stored config: `node ${CLAUDE_PLUGIN_ROOT}/scripts/config.js get --data-dir "${CLAUDE_PLUGIN_DATA}"`.

## Writing the report

You write the output yourself. No template files, no assembly scripts, no intermediate formats.

### Output paths

All under `${CLAUDE_PLUGIN_DATA}/reports/`:

| Channel | Path |
|---|---|
| HTML, Artifact (default) | `{doc-basename}-doc-visual.artifact.html` |
| HTML, local (`--local` / non-capable fallback) | `{doc-basename}-doc-visual.html` |
| md | `{doc-basename}-doc-visual.md` — also inserted into the response body |
| md, published on request | `{doc-basename}-doc-visual.artifact.md` |

The HTML is one file you write yourself; on the local channel it embeds diagrams as
`<pre class="mermaid">` blocks. The md report uses ` ```mermaid ` fences, footer links to the source
path, and no CSS or `<script>`. The saved md copy lets report-manager list and refine it later.

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
| **Diagram** (Mermaid locally, inline SVG on an Artifact) | Relationships, flows, hierarchies — when connections are the point |
| **Table** | Comparisons, specs, 2-3 column data |
| **Code block** | Configs, commands, API examples |
| **Prose paragraph** | Narrative explanation, context, reasoning |
| **Definition list** | Term → meaning pairs |
| **Callout box** | Warnings, tips, important notes |

### Content integrity — the cardinal rule

The source document's substance must survive intact in the report. This means:

- **Specific numbers, names, dates** from the source → appear in the report
- **Technical details** (configs, commands, parameters) → preserved verbatim
- **Reasoning and nuance** → kept, not flattened to bullet points
- **Code examples** → reproduced in full

If you're writing "this section covers X" or "the document describes Y" — stop. That's a summary of the content, not the content. Include the actual content.

This cardinal rule is *summary-leak*, one of the reflexes in `${CLAUDE_PLUGIN_ROOT}/references/design-system/anti-slop-tells.md` that pass every gate and still flatten the output — read it while shaping the content.

Short documents (<500 chars) get 1 section + 1 hero diagram. Long documents get proper sectioning but still preserve all substance.

## Validate and deliver

**Artifact channel (HTML default):**
1. `node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-gate.js <output-path> --content-only` — fix and re-run, max 2 retries.
2. Publish the file with the `Artifact` tool, `description` = one sentence on what the page is.
3. `node ${CLAUDE_PLUGIN_ROOT}/scripts/write-artifact-sidecar.js --report <output-path> --url <artifact-url> --title <title>`
4. Reply with the URL and the publish notice (`channel-decision.md` "Artifact channel").

**Local channel (`--local` / non-capable fallback):**
1. `node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-gate.js <output-path>`
2. `node ${CLAUDE_PLUGIN_ROOT}/scripts/render-report.js <output-path> --data-dir "${CLAUDE_PLUGIN_DATA}"`, then read the PNG and check density, hierarchy, Mermaid integrity, and overflow (`visual-self-audit.md`).
3. `open <output-path>`

**md:** deliver in the response body. On a publish request, publish the `.artifact.md` with steps 2–3
above and no gate — see "Markdown on request" in `channel-decision.md`.

**Publish unavailable or failed:** HTML → regenerate as the local report at its local path, don't
open the Artifact file; md → deliver in the chat body. Say so in one line, don't ask.

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
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/channel-decision.md` | Before writing — channel, flags, config, per-channel rules |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/mermaid-patterns.md` | Before writing any Mermaid diagram (local and md) |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md` | When setting up CSS custom properties and Mermaid theme |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md` | When deciding diagram type for a section |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md` | When a diagram feels complex |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/anti-slop-tells.md` | While shaping content — to check you're not falling into a behavioral-slop reflex |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/visual-self-audit.md` | After the gate passes — the render-and-look loop (full procedure) |
