---
name: doc-visual
description: |
  Convert any markdown document (research/spec/RFC/ADR/design) into a diagram-enriched report.
  Use when asked to visualize, explain, or make a document easier to understand —
  "visualize this research", "make this design doc easier to read",
  "summarize this spec with diagrams", "turn this document into diagrams". Single md file input.
argument-hint: "[md-file-path] [--format html|md] [--lang code]"
allowed-tools: Read, Agent, Bash(node *), Bash(open *), Bash(rm -rf /tmp/doc-visual-*)
---

# doc-visual

Reads a markdown document and generates an HTML or markdown report that automatically embeds a diagram (chosen from 13 types) matching the meaning of each section.

## Instructions

### Format Detection

| Flag | Values | Default |
|---|---|---|
| `--format` | `html` / `md` | `html` |
| `--lang` | ISO code | auto-detected from document |

### Input Parsing

Argument = single markdown file path. Directories/URLs/stdin are not supported.

- Validate file existence + markdown extension (`.md`, `.markdown`, `.txt`)
- File missing/no permission → abort immediately

### Pipeline

```
[1] parse-markdown.js       → sections[] JSON
[2] section-analyzer (agent)→ adds diagram_plan to sections[]
[3] diagram-generator (agent)→ summary + mermaid_code
[4] taste-gate.js           → detect Layer 0 violations, re-invoke [3] on violation (max 2 times)
[5] assemble-report.js      → assemble HTML or MD
```

### Step 1 — Parse markdown

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/parse-markdown.js <input-md-path>
```

stdout: `{ sections: [...] }` JSON. exit 1 if file missing.
Fallback: empty file → abort. No H1/H2 → treat as a single section.

### Step 2 — Section analyzer (subagent)

Invoke `section-analyzer` via the Agent tool. Inline in the prompt:
- `sections[]` JSON
- Contents of `references/design-system/diagram-type-selection.md`
- Summary of `references/design-system/diagram-density-rules.md`

Output: `diagram_plan` added.

### Step 3 — Diagram generator (subagent)

Can be invoked in parallel per section. Invoke `diagram-generator` via the Agent tool. In the prompt:
- The relevant section
- `references/design-system/semantic-tokens.md` (current aesthetic set values)
- The relevant type section of `references/design-system/mermaid-patterns.md`
- `references/design-system/diagram-density-rules.md`

Output: `summary` + `mermaid_code`.

### Step 4 — Taste gate

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/taste-gate.js --type <diagram-type> --mermaid-file <path>
# or, for short inline snippets:
node ${CLAUDE_PLUGIN_ROOT}/scripts/taste-gate.js --type <diagram-type> --mermaid '<code>'
```

stdout: `{ ok: bool, violations: [...] }`. Exit 0 = pass, 1 = violation, 2 = bad args.
On violation, re-invoke Step 3 for that section only (append violations to the prompt). After 2 retries still failing → exclude that section's diagram, log a warning.

### Step 5 — Assemble

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/assemble-report.js \
  --template ${CLAUDE_PLUGIN_ROOT}/templates/doc-visual.html \
  --shared ${CLAUDE_PLUGIN_ROOT}/shared \
  --sections <sections-json-path> \
  --output <output-path> \
  --format <html|md> \
  --skill-prefix doc-visual
```

`--sections` must end with `.json` to enable JSON mode. The JSON includes `meta` (`lang`, `title`, `source_path`, tokens, etc.) + `sections[]`.

### Output

- HTML: `${CLAUDE_PLUGIN_DATA}/reports/{doc-basename}-doc-visual.html`. Run `open` after completion.
- MD: insert directly into the response body. Footer links to the source path.

### Error Handling

| Failure | Action |
|---|---|
| No input/no permission | Abort immediately |
| parse-markdown: broken md | Fall back to a single H1, warn |
| section-analyzer failure | All sections skip_diagram: true, summary only |
| diagram-generator failure | Skip that section's diagram, summary only |
| taste-gate violation after 2 retries | Exclude that section's diagram |
| assemble failure | Surface the error, preserve partial artifacts |

### Gotchas

- **Long documents (>10000 chars)** → force section summaries
- **Short documents (<500 chars)** → 1 section + 1 hero only
- **Existing Mermaid blocks** → upgrade with Layer 0 tokens and preserve
- **refine follow-up** → `report-manager refine` regenerates only specific sections (Step 3-4 only)
- **venn/pyramid requests** → assemble-report.js renders via fallback SVG/Chart.js
- **H4+ headers** → `parse-markdown.js` only recognizes H1/H2/H3 as section boundaries.
  H4 and below are included verbatim in the parent H2/H3 section's `body` and become part of the summary.
  They are not split into independent sections. If the summary becomes too long, section-analyzer
  recognizes the internal structure and compresses it as sub-topics in the summary — but to get
  individual diagrams, promote H4 to H3 in the source md.

### Reference Files

- `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md`
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md`
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md`
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/taste-gate.md`
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/mermaid-patterns.md`
- `${CLAUDE_PLUGIN_ROOT}/references/report-generation-workflow.md`
- `references/section-structure.md`
