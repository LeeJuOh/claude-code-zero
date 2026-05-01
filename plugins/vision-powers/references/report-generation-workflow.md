# Report Generation Workflow

Shared workflow for generating HTML reports. All report-generating skills (plugin-visual, diff-visual, doc-visual) follow this sequence after completing their analysis phase.

Each skill provides these parameters before entering the workflow:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `{output-path}` | Full path to the final HTML report | `${CLAUDE_PLUGIN_DATA}/reports/feature-auth-diff-visual.html` |
| `{template-name}` | HTML template filename in `../../templates/` | `diff-visual.html` |
| `{skill-prefix}` | Prefix for temp directory naming | `diff-visual` |
| `{expected-sections}` | Number of sections the template expects | `10` |
| `{report-title}` | Title for the report | `"Diff Visual: feature/auth..main"` |
| `{aesthetic-hint}` | Visual style hint | `"Editorial"` |
| `{agent-prompt-data}` | Skill-specific analysis data to pass to the writer agent | varies |

## Pre-Step: Check user config

Before starting, check if the user has saved preferences:
```
Bash(node {plugin-root}/scripts/config.js get)
```

If config exists, apply relevant values:
- `default_language` → use as output language if no language was explicitly detected
- `aesthetic` → use as aesthetic hint if no hint was specified by the skill
- `auto_open` → if `true`, automatically open the report in the browser after generation (Step 6)
- `reports_dir` → if set, use as the reports output directory instead of `${CLAUDE_PLUGIN_DATA}/reports/`

If no config file exists, proceed with defaults. Do not prompt the user to set up config — it's optional.

## Steps

### Step 1: Resolve paths and read references

Resolve these relative paths (from the skill directory) to absolute paths:
- Template: `../../templates/{template-name}`
- Section structure: `references/section-structure.md`
- Semantic tokens: `../../references/design-system/semantic-tokens.md`
- Diagram type selection: `../../references/design-system/diagram-type-selection.md`
- Diagram density rules: `../../references/design-system/diagram-density-rules.md`
- Taste gate: `../../references/design-system/taste-gate.md`
- Assembler script: `../../scripts/assemble-report.js`
- Validator script: `../../scripts/validate-report.js`
- Renderer script: `../../scripts/render-report.js`
- Rotation script: `../../scripts/aesthetic-rotation.js`
- Shared directory: `../../shared/`

**Read 5 reference files** in a single parallel Read call:
1. Section structure (`references/section-structure.md`)
2. Semantic tokens (`../../references/design-system/semantic-tokens.md`)
3. Diagram type selection (`../../references/design-system/diagram-type-selection.md`)
4. Diagram density rules (`../../references/design-system/diagram-density-rules.md`)
5. Taste gate (`../../references/design-system/taste-gate.md`)

Save their content for Step 3 — the visual-report-writer receives content directly so it can start writing immediately without a read turn.

Do NOT read the template, assembler, validator, renderer, rotation, or shared directory — those are passed as paths to the assembler script or executed as CLIs.

**Fetch recent aesthetic choices** so the next report avoids repeating the same palette+font:

```
Bash(node {rotation-script-path} recent --n 3)
```

The script prints a JSON array (newest last) of the last 3 recorded choices. If the file doesn't exist yet, it prints `[]`. Save this output as `{recent-aesthetics}` for Step 3.

### Step 2: Create sections temp directory

Path: `/tmp/{skill-prefix}-{dirname}-sections/`

Pick any 8-character hex string for `{dirname}` (e.g., `a1b2c3d4`). No mkdir needed — the visual-report-writer creates files via Write, which auto-creates directories.

### Step 3: Delegate to visual-report-writer

```
Agent(subagent_type: "vision-powers:visual-report-writer", prompt: {
  {agent-prompt-data},
  sections output directory (absolute path from Step 2),
  section structure content (full text read in Step 1),
  semantic tokens content (full text read in Step 1),
  diagram type selection content (full text read in Step 1),
  diagram density rules content (full text read in Step 1),
  taste gate content (full text read in Step 1),
  recent aesthetics to avoid (JSON from Step 1: {recent-aesthetics}),
  Output language: {detected language},
  Report title: {report-title},
  Aesthetic hint: {aesthetic-hint}
})
```

Pass the **file contents** read in Step 1, not paths. This eliminates the agent's read turn — it can start writing sections immediately.

The agent writes `section-1.html` through `section-N.html` and `metadata.json` to the sections directory. It selects a palette and font pairing that do **not** match any entry in the recent-aesthetics list (unless only one palette or one pairing exists in the design system — in which case repetition is unavoidable and the agent should note it).

**Do NOT background this agent.** Plugin-defined agents silently ignore `permissionMode`, so the visual-report-writer needs user approval for each Write call. Backgrounded agents cannot prompt for permissions and will fail silently. Always run in the foreground.

### Step 4: Assemble report

```
Bash(node {assembler-path} --template {template-path} --sections {sections-dir} --metadata {sections-dir}/metadata.json --shared {shared-dir-path} --output {output-path})
```

### Step 5: Validate report (static + visual)

Validation runs in two passes. The static pass is always on; the visual pass is best-effort (skipped if Chrome is not installed).

#### 5a. Static validation (always)

```
Bash(node {validator-path} {output-path} --expected-sections {expected-sections})
```

Checks: unreplaced placeholders, section content density, Mermaid diagram keywords and parser-breakers (rgba/color in classDef, unquoted special chars, stateDiagram `<br/>` and parenthesized labels, sequenceDiagram message specials), Chart.js data arrays, expected section count. Exits 0 on PASS, 1 on FAIL with a list of issues.

If FAIL: fix the source artifact, not the assembled output file, then re-run assembly and validation. For JSON-mode reports, edit `sections-data.json` and re-render sections. For HTML-section mode, edit the relevant `section-*.html` or `metadata.json` file and re-assemble.

#### 5b. Visual self-audit (best-effort)

*Why: The static validator catches parser-breaking syntax. The visual audit catches what only becomes visible after rendering — Mermaid diagrams that produce empty SVGs despite valid syntax, truncated labels, broken layouts, chart canvases that failed to paint, overlapping elements at the chosen viewport width.*

```
Bash(node {plugin-root}/scripts/render-report.js {output-path}; echo "EXIT=$?")
```

The script prints the absolute PNG path to stdout on success, or writes a stderr error if Chrome is not installed. The trailing `echo "EXIT=$?"` appends a literal `EXIT=0` or `EXIT=1` marker as the last stdout line so the branching below is decidable without relying on stderr heuristics.

**If the last stdout line is `EXIT=0`** (PNG path on the preceding line): use the `Read` tool on the PNG path. Inspect the rendered image for:

- Mermaid diagrams: did each `<pre class="mermaid">` block render to an SVG? Any showing raw code means Mermaid failed silently.
- Chart.js canvases: are charts actually drawn, or blank?
- Layout: any text overlapping, clipped, or flowing outside its container?
- Completeness: does the screenshot show all sections the report is supposed to have? (The default viewport captures 8000px tall; long reports may be truncated — re-render with `--height` larger if needed.)
- Diagram clarity: are node labels readable? Are connections routing cleanly?

If any visual issue is found, fix the source artifact (`sections-data.json`, `section-*.html`, or `metadata.json` depending on the report mode), re-assemble, and re-run `render-report.js` until the visual audit passes or shows only acceptable artifacts.

**If the last stdout line is `EXIT=1`** (Chrome not found or crash, stderr has the cause): log a one-line note that visual audit was skipped, continue to Step 6. Do not block the workflow — static validation alone is acceptable.

### Step 6: Coherence Review (optional)

*Why: A report that looks correct to its author may confuse or mislead a fresh reader. A context-free review catches narrative gaps, internal contradictions, and unsupported assumptions that the author's knowledge masks.*

This step is **off by default**. Activate it with `--verify` flag on the skill invocation, or set `auto_verify: true` in user config.

When activated:

```
Agent(subagent_type: "vision-powers:coherence-reviewer", prompt: {
  Report file path: {output-path},
  Output language: {detected language}
})
```

The coherence-reviewer reads ONLY the assembled report — no analysis data, no source code, no git history. This simulates a first-time reader's perspective.

**If issues found**:
- **HIGH severity**: Fix the source artifact, re-assemble the report, then re-run validation (Step 5)
- **MEDIUM/LOW severity**: Note in the user notification (Step 7) as optional improvements

**If COHERENT**: Proceed to Step 7.

### Step 7: Log report and notify

Log the generated report for history tracking:
```
Bash(node {plugin-root}/scripts/log-report.js --path {output-path} --type {skill-prefix} --title {report-title})
```

Output the `file:///` URL to the user:
```
Report generated: file://{output-path}
```

If `auto_open` is `true` in user config, also open it:
```
Bash(open {output-path})
```

### Step 8: Cleanup

Remove temporary sections directory:
```
Bash(rm -rf /tmp/{skill-prefix}-{dirname}-sections)
```

### Step 9: Suggest follow-up

After reporting the file URL, suggest optional next steps:
- `/fact-check` — verify the report's factual accuracy against the actual codebase
- `/report-manager refine` — refine specific sections based on feedback
- `--verify` — if not used this time, mention that coherence review is available for future runs

This is informational — just a brief suggestion, not an automatic invocation.

## doc-visual Mode (JSON input)

doc-visual bypasses the visual-report-writer agent entirely. Instead of writing individual `section-N.html` files, the doc-visual pipeline produces a single `sections.json` file that `assemble-report.js` consumes directly.

### Pipeline

```
parse-markdown → section-analyzer → diagram-generator → taste-gate → assemble-report
```

Each stage is a Node script under `scripts/`:

| Stage | Script | Output |
|-------|--------|--------|
| 1. Parse | `parse-markdown.js` | Raw section objects with headings + body text |
| 2. Analyze | `section-analyzer.js` | Sections enriched with `diagram_plan` fields |
| 3. Generate | `diagram-generator.js` | Sections with `mermaid_code` added |
| 4. Gate | `taste-gate.js` | Validated sections + `meta` block → `sections.json` |
| 5. Assemble | `assemble-report.js` | Final `report.html` (or `.md`) |

### Input format

`--sections` receives a path to a `.json` file (not a directory):

```json
{
  "sections": [
    {
      "id": "sec-1",
      "heading": "Section Heading",
      "level": 2,
      "summary": "One-sentence summary shown in the report.",
      "body": "Full body text (optional if summary is present).",
      "diagram_plan": {
        "skip_diagram": false,
        "diagram_type": "flowchart",
        "is_hero": true
      },
      "mermaid_code": "flowchart TD\n  A --> B",
      "fallback_data": { "items": [] }
    }
  ],
  "meta": {
    "title": "Document Title",
    "source_path": "/path/to/source.md",
    "lang": "en",
    "color_scheme": "light",
    "tokens": {
      "paper": "#faf7f2",
      "paper-2": "#f2ede4",
      "ink": "#1c1917",
      "muted": "#57534e",
      "accent": "#b5523a",
      "accent-tint": "rgba(181,82,58,0.08)",
      "link": "#2563eb",
      "rule": "rgba(28,25,23,0.12)"
    }
  }
}
```

### Assembler invocation

HTML output (default):

```bash
node assemble-report.js \
  --template ../../templates/doc-visual.html \
  --sections /tmp/sections.json \
  --shared ../../shared/ \
  --output /path/to/report.html \
  --skill-prefix doc-visual
```

Markdown output (`--format md`):

```bash
node assemble-report.js \
  --template ../../templates/doc-visual.html \
  --sections /tmp/sections.json \
  --output /path/to/report.html \
  --format md \
  --skill-prefix doc-visual
```

When `--format md` is used, the output file extension is changed from `.html` to `.md` automatically.

`--metadata` is optional in JSON mode. If provided, the external metadata file is merged on top of the JSON-embedded `meta` block (external file wins on key conflicts).

### Fallback budget validation

`assemble-report.js` runs `validateFallbackBudget` on every section before rendering. Limits:

| Diagram type | Limit | Behaviour on exceed |
|---|---|---|
| `venn` | 3 circles | Diagram skipped with a warning |
| `pyramid` | 6 layers | Diagram skipped with a warning |
| `quadrant` | 12 items | Items truncated to 12, no warning |

Budget validation runs at assemble time (not at taste-gate time) so that a sections.json produced by an earlier pipeline stage can still be fixed by editing before re-assembly.

### Template placeholder system

The doc-visual template uses `{UPPER_CASE}` curly-brace placeholders instead of the `<!-- KEY -->` HTML-comment style used by other templates. The assembler calls `replaceCurly(html, map)` to fill them. Key placeholders:

| Placeholder | Source |
|---|---|
| `{TOKEN_PAPER}`, `{TOKEN_INK}`, etc. | `meta.tokens.*` (key `paper-2` → `TOKEN_PAPER_2`) |
| `{SECTIONS_HTML}` | Rendered section HTML |
| `{TOC_HTML}` | Auto-generated `<nav class="toc">` |
| `{DOC_TITLE}` | `meta.title` |
| `{SOURCE_PATH}` | `meta.source_path` |
| `{TIMESTAMP}` | ISO timestamp at assemble time |
| `{LANG}` | `meta.lang` |
| `{COLOR_SCHEME}` | `meta.color_scheme` |
| `{SHARED_JS}` | Contents of `shared/shared.js` (if `--shared` provided) |
