---
name: diff-visual
description: >
  Visualize git diffs as interactive HTML reports with architecture diagrams,
  KPI dashboards, code review cards, and side-by-side comparisons.
  Use when asked to visualize, review, explain, or summarize a diff, branch,
  commit, PR, or set of changes. Accepts branch names, commit hashes, HEAD,
  PR numbers, or commit ranges. Not for making changes or resolving conflicts.
argument-hint: "<branch|commit|HEAD|#PR|range> [--lang <code>]"
allowed-tools: Read, Glob, Grep, Agent, AskUserQuestion, Bash(git diff *), Bash(git log *), Bash(git show *), Bash(git rev-parse *), Bash(git branch *), Bash(wc -l *), Bash(gh pr diff *), Bash(gh pr view *), Bash(node *), Bash(open *), Bash(rm -rf /tmp/diff-visual-*)
---

# Diff Visual

Visualize git diffs as self-contained interactive HTML reports with architecture diagrams, KPI dashboards, code review assessments, and side-by-side comparisons.

## Instructions

### Scope Detection

Parse the user's argument to determine the diff scope:

| Input | Interpretation | Git command |
|-------|---------------|-------------|
| `HEAD` or nothing | Uncommitted changes | `git diff HEAD` |
| `branch-name` | Branch vs main/master | `git diff main...branch-name` |
| `#123` or PR URL | Pull request diff | `gh pr diff 123` |
| `abc1234` | Single commit | `git show abc1234` |
| `abc..def` | Commit range | `git diff abc..def` |
| `abc...def` | Three-dot range | `git diff abc...def` |

**Default base**: If the scope implies comparison against a base branch, detect the default branch:
```
git rev-parse --verify main 2>/dev/null || git rev-parse --verify master
```

**Scope validation**: Verify the ref/range exists before proceeding. If invalid, inform the user and stop.

### Language Detection

Determine the output language:

1. **Explicit argument**: `--lang <code>` (e.g., `--lang ko`, `--lang fr`, `--lang zh`) → use that language. Any language code is valid
2. **User message text**: Detect the language of the message (excluding ref/path) and match it
   - Examples: 한글 → Korean, 日本語 → Japanese, "en español" → Spanish, "auf Deutsch" → German
3. **Ref-only with no other text**: Default to English

### Data Gathering

Collect comprehensive data about the diff. Run git commands in parallel where possible.

**Step 1 — Stats and metadata** (parallel):
```
git diff {scope} --stat
git diff {scope} --name-status
git log {scope-log-range} --oneline --format="%h %s"
git log {scope-log-range} --format="%h|%an|%s|%ai" (for decision log)
git log {scope-log-range} -- CHANGELOG.md (CHANGELOG update check)
```

Where `{scope-log-range}` is:
- For branch: `main..branch-name`
- For range: `abc..def`
- For single commit: `-1 abc1234`
- For HEAD: `-1 HEAD` (or recent commits if uncommitted)

**Step 2 — Quantitative metrics** (parallel):
- Total lines added/removed: parse `--stat` summary or use `git diff {scope} --numstat`
- Files changed count, new files, deleted files (from `--name-status`)
- New modules/directories introduced
- Test file changes (files matching `*test*`, `*spec*`, `*.test.*`)
- Housekeeping ratio: classify each changed file as feature/refactor/test/docs/config,
  calculate percentage breakdown for KPI chart

**Step 3 — Content analysis**:
Read the full diff content and changed files to understand:
- **Architecture changes**: New modules, changed imports/exports, dependency shifts
- **Feature inventory**: What features were added/modified/removed
- **API surface changes**: New/changed public functions, types, endpoints
- **Test coverage**: New/modified tests, what they cover
- **Decision rationale**: Reconstruct why decisions were made, not just what changed:
  - Commit messages and PR descriptions (if PR scope)
  - Plan files in the project (Glob for **/plan*, **/RFC*, **/ADR*)
  - CLAUDE.md or project convention docs
  - For each significant design choice, classify confidence:
    - Confirmed: explicitly documented in commit/PR/plan
    - Inferred: reasonable inference from code patterns
    - Uncertain: rationale not recoverable — flag for documentation
- **Housekeeping check**:
  - CHANGELOG.md: Does it have an entry for these changes? (yes/no)
  - README.md / docs/*.md: Do they need updates given new/changed features? (yes/no/not-applicable)
  - Record results for KPI dashboard badges

Use Glob + Grep to find related files (tests, configs, docs) that provide context.

**CRITICAL**: Read actual changed file contents — do not rely solely on diff hunks. Understanding the full file context is essential for accurate architecture diagrams and code review.

### Verification Checkpoint

Before generating the report, **produce a structured fact sheet** listing every claim you will present:

1. **Quantitative check**: Lines +/−, file counts, module counts — all must match git output exactly
2. **Name check**: Every function name, type name, file path mentioned must exist in the actual diff
3. **Behavior check**: Every behavioral description must be traceable to specific code changes
4. **Source citation**: For each claim in the analysis, identify the source (commit hash, file:line, diff hunk)

If any claim cannot be sourced, remove it or mark it as uncertain.

### Report Generation

Use extended thinking for the analysis above. The depth of analysis directly determines report quality.

Delegate HTML report generation to the visual-report-writer agent.

1. **Determine output path**:
   ```
   ~/.claude-code-zero/vision-powers/reports/{scope}-diff-visual.html
   ```
   Where `{scope}` is a sanitized version of the input (e.g., `feature-auth`, `abc1234`, `pr-123`, `HEAD`).

2. **Resolve reference paths**:
   - Template: resolve `../../templates/diff-visual.html` to absolute path
   - Section structure: resolve `references/section-structure.md` to absolute path
   - Font system: resolve `../../references/design-system/font-system.md` to absolute path
   - Anti-slop rules: resolve `../../references/design-system/anti-slop-rules.md` to absolute path
   - Assembler script: resolve `../../scripts/assemble-report.js` to absolute path
   Do NOT read these files — they are passed as paths to the agent and assembler.

3. **Create sections temp directory**:
   The sections directory path: `/tmp/diff-visual-{dirname}-sections/`
   Pick any 8-character hex string for `{dirname}` (e.g., `a1b2c3d4`).
   No mkdir needed — the visual-report-writer creates files via Write, which auto-creates directories.

4. **Delegate to visual-report-writer**:
   ```
   Agent(subagent_type: "vision-powers:visual-report-writer", prompt: {
     Analysis data: {all gathered data — stats, metrics, architecture, features, code review, decisions},
     sections output directory (absolute path from step 3),
     section structure path (absolute path from step 2),
     font system path (absolute path from step 2),
     anti-slop rules path (absolute path from step 2),
     Output language: {detected language},
     Report title: "Diff Visual: {scope description}",
     Aesthetic hint: "Editorial" (or "Blueprint" for infrastructure-heavy diffs)
   })
   ```
   The agent writes section files and `metadata.json` to the sections directory.

5. **Assemble report** — run the assembler script to combine template + sections:
   ```
   Bash(node {assembler-path} --template {template-path} --sections {sections-dir} --metadata {sections-dir}/metadata.json --output {output-path})
   ```

6. **Report validation** — after assembly, Read the output HTML file and verify:
   - No unreplaced section placeholders (`<!-- SECTION_`)
   - Every `<section>` has meaningful content beyond just a heading
   - Mermaid `<pre class="mermaid">` blocks contain diagram syntax, not just placeholder comments
   - Chart.js data is populated (not empty object/array)

   If issues found, fix via Edit on the output file.

   If `mcp__claude-in-chrome__*` tools are available, validate in Chrome:
   1. Open the report via `Bash(open {output-path})` — Chrome extensions cannot navigate to `file://` URLs directly, so let the system browser open it first
   2. Call `tabs_context_mcp` to discover the newly opened tab (match by `file://` URL or report filename in the tab title)
   3. Use `javascript_tool` on the discovered tab to check for Mermaid render errors and empty sections
   4. Fix any issues found via Edit on the output file

7. **Report completion**: Output the `file:///` URL to the user:
   ```
   Report generated: file://{absolute-path-to-report}
   ```

8. **Cleanup** — remove temporary sections directory:
   ```
   Bash(rm -rf /tmp/diff-visual-{dirname}-sections)
   ```

### Reference Files

- `references/section-structure.md` — HTML structure patterns for each report section. Visual-report-writer reads it to generate section files
- `../../templates/diff-visual.html` — HTML template with all CSS/JS baked in. The assembler script combines it with section files
- `../../scripts/assemble-report.js` — Assembler script (Node.js) that merges template + section files + metadata into the final HTML report
- `../../references/design-system/font-system.md` — Font pairing selection guide. Visual-report-writer reads it directly
- `../../references/design-system/anti-slop-rules.md` — Quality checklist for report writing. Visual-report-writer reads it directly
