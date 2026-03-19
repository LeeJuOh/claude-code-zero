# Report Generation Workflow

Shared workflow for generating HTML reports. All report-generating skills (agent-extension-visualizing, diff-visual, plan-visual, project-recap) follow this sequence after completing their analysis phase.

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

### Step 1: Resolve reference paths

Resolve these relative paths (from the skill directory) to absolute paths:
- Template: `../../templates/{template-name}`
- Section structure: `references/section-structure.md`
- Font system: `../../references/design-system/font-system.md`
- Anti-slop rules: `../../references/design-system/anti-slop-rules.md`
- Assembler script: `../../scripts/assemble-report.js`
- Validator script: `../../scripts/validate-report.js`
- Shared directory: `../../shared/`

Do NOT read these files — they are passed as paths to the agent and assembler.

### Step 2: Create sections temp directory

Path: `/tmp/{skill-prefix}-{dirname}-sections/`

Pick any 8-character hex string for `{dirname}` (e.g., `a1b2c3d4`). No mkdir needed — the visual-report-writer creates files via Write, which auto-creates directories.

### Step 3: Delegate to visual-report-writer

```
Agent(subagent_type: "vision-powers:visual-report-writer", prompt: {
  {agent-prompt-data},
  sections output directory (absolute path from Step 2),
  section structure path (absolute path from Step 1),
  font system path (absolute path from Step 1),
  anti-slop rules path (absolute path from Step 1),
  Output language: {detected language},
  Report title: {report-title},
  Aesthetic hint: {aesthetic-hint}
})
```

The agent writes `section-1.html` through `section-N.html` and `metadata.json` to the sections directory.

### Step 4: Assemble report

```
Bash(node {assembler-path} --template {template-path} --sections {sections-dir} --metadata {sections-dir}/metadata.json --shared {shared-dir-path} --output {output-path})
```

### Step 5: Validate report

```
Bash(node {validator-path} {output-path} --expected-sections {expected-sections})
```

The script checks: unreplaced placeholders (section + metadata), section content density, Mermaid diagram-type keywords, Chart.js data arrays, and section count. Exits 0 on PASS, 1 on FAIL with a list of issues.

If FAIL: fix the reported issues via Edit on the output file, then re-run the script until PASS.

**Optional Chrome visual verification** — only if `mcp__claude-in-chrome__*` tools are available:
1. Start a local HTTP server: `Bash(python3 -m http.server 0 -d "$(dirname {output-path})" 2>&1 & echo $!)`
2. Call `tabs_context_mcp` (with `createIfEmpty: true`) to get or create an MCP tab group.
3. Use `navigate` to open `http://localhost:{port}/{filename}` in the MCP tab.
4. Use `javascript_tool` to check for Mermaid render errors and empty sections.
5. Fix any issues found via Edit on the output file.
6. Kill the server: `Bash(kill {pid} 2>/dev/null)`

### Step 6: Log report and notify

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

### Step 7: Cleanup

Remove temporary sections directory:
```
Bash(rm -rf /tmp/{skill-prefix}-{dirname}-sections)
```

### Step 8: Suggest fact-check

After reporting the file URL, mention that the user can run `/fact-check` to verify the report's accuracy against the actual codebase. This is optional — just a one-line suggestion, not an automatic invocation.
