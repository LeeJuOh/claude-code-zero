# Report Generation Workflow

Shared workflow for generating HTML reports. All report-generating skills (plugin-visual, diff-visual, plan-visual, project-recap-visual) follow this sequence after completing their analysis phase.

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
- Font system: `../../references/design-system/font-system.md`
- Anti-slop rules: `../../references/design-system/anti-slop-rules.md`
- Color palette: `../../references/design-system/color-palette.md`
- Diagram argumentation: `../../references/design-system/diagram-argumentation.md`
- Assembler script: `../../scripts/assemble-report.js`
- Validator script: `../../scripts/validate-report.js`
- Renderer script: `../../scripts/render-report.js`
- Rotation script: `../../scripts/aesthetic-rotation.js`
- Shared directory: `../../shared/`

**Read 5 reference files** in a single parallel Read call:
1. Section structure (`references/section-structure.md`)
2. Font system (`../../references/design-system/font-system.md`)
3. Anti-slop rules (`../../references/design-system/anti-slop-rules.md`)
4. Color palette (`../../references/design-system/color-palette.md`)
5. Diagram argumentation (`../../references/design-system/diagram-argumentation.md`)

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
  font system content (full text read in Step 1),
  anti-slop rules content (full text read in Step 1),
  color palette content (full text read in Step 1),
  diagram argumentation content (full text read in Step 1),
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

If FAIL: fix the reported issues via Edit on the output file, then re-run the script until PASS.

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

If any visual issue is found, fix via Edit on the HTML and re-run `render-report.js` until the visual audit passes or shows only acceptable artifacts.

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
- **HIGH severity**: Fix via Edit on the output file, then re-run validation (Step 5)
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
