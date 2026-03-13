---
name: plan-visual
description: >
  Review implementation plans as interactive HTML reports with architecture
  diagrams, blast radius analysis, risk assessment, and gap detection.
  Use when asked to review, visualize, evaluate, assess, or critique an
  implementation plan. Accepts plan file paths or reads from the current
  Claude Code plan. Not for creating or executing plans.
argument-hint: "<plan-file-path> [codebase-path] [--lang ko|en|ja]"
allowed-tools: Read, Glob, Grep, Agent, AskUserQuestion, Bash(wc -l *)
---

# Plan Visual

Review implementation plans as self-contained interactive HTML reports with architecture diagrams, blast radius analysis, risk assessment, change-by-change breakdowns, and understanding gap detection.

## Instructions

### Input Parsing

Determine the plan source and codebase path from the user's message:

1. **Plan file path**: Explicit path to a plan file (`.md`, `.txt`, or other text format)
   - Resolve relative paths against cwd
   - Common locations: `~/.claude/plans/`, project root, `docs/`
2. **No path specified**: Check for an active Claude Code plan
   - Search `~/.claude/plans/` for recent plan files (use Glob)
   - If multiple found, use AskUserQuestion to let the user choose
   - If none found, inform user and stop

**Codebase path**: Second argument or defaults to cwd. This is the root directory for cross-referencing plan items against actual code.

### Language Detection

Determine the output language:

1. **Explicit argument**: `--lang ko`, `--lang en`, `--lang ja` → use that language
2. **User message text**: If the message (excluding path) contains non-English text, use that language
   - Korean: 한글 텍스트, "한국어", "한글로", "플랜 리뷰", "계획 검토"
   - Japanese: 日本語テキスト, "日本語で"
   - English: English text, "in English"
3. **Path-only with no other text**: Default to English

### Plan Extraction

Read the plan file and extract structured information:

- **Problem statement**: What problem does the plan solve?
- **Proposed changes**: List of files to create/modify/delete with descriptions
- **Architecture decisions**: Technology choices, patterns, trade-offs
- **Rejected alternatives**: What was considered but not chosen (if documented)
- **Scope boundaries**: What's explicitly in/out of scope
- **Implementation phases**: If the plan defines phases or ordering

### Codebase Cross-Reference

Analyze the actual codebase to validate the plan:

**Step 1 — Referenced files** (parallel Glob + Read):
- Read all files the plan mentions modifying (verify they exist and match plan's assumptions)
- Read files the plan mentions creating (verify they don't already exist, or note conflicts)

**Step 2 — Dependency tracing** (Grep + Read):
- For each file to be modified: find files that import/reference it
- For each file to be created: find existing files with similar names/patterns
- Check test files for affected modules

**Step 3 — Context files**:
- README.md, CHANGELOG.md, CLAUDE.md (project conventions)
- Package manifests (package.json, Cargo.toml, etc.)
- Config files referenced by the plan

**CRITICAL**: The goal is to understand what the plan will touch and what it might miss — not to implement the plan. Focus on validation, not execution.

### Blast Radius Mapping

For each planned change, map the ripple effects:

- **Direct impact**: Files explicitly mentioned in the plan
- **Import dependents**: Files that import/use changed modules (found via Grep)
- **Test coverage**: Tests that cover changed code (found via Glob pattern matching)
- **Configuration**: Config files that reference changed modules
- **Public API**: Any changes to exported interfaces visible to consumers

Classify each affected file:
- **Covered**: Plan explicitly addresses this file
- **Likely missed**: Plan doesn't mention this file but it will be affected
- **Gap**: Plan modifies something that requires coordinated changes here

### Verification Checkpoint

Before generating the report, **produce a structured fact sheet** listing every claim you will present:

1. **File existence**: Every file the plan mentions — does it exist (for modifications) or not exist (for creations)?
2. **Import accuracy**: Do the import relationships match what the plan assumes?
3. **Scope completeness**: Are there files affected by changes that the plan doesn't address?
4. **Ordering safety**: Can the phases execute in the described order without breaking intermediate states?
5. **Assumption check**: Are there assumptions in the plan that contradict the actual codebase?

Document discrepancies as "Understanding Gaps" for Section 9.

### Report Generation

Use extended thinking for the analysis above. The depth of analysis directly determines report quality.

Delegate HTML report generation to the visual-report-writer agent.

1. **Determine output path**:
   ```
   ~/.claude-code-zero/vision-powers/reports/{plan-name}-plan-visual.html
   ```
   Where `{plan-name}` is derived from the plan file name (e.g., `cozy-moseying-star`, `auth-redesign`).

2. **Resolve reference paths**:
   - Template: resolve `../../templates/plan-visual.html` to absolute path
   - Font system: resolve `../../references/design-system/font-system.md` to absolute path
   - Anti-slop rules: resolve `../../references/design-system/anti-slop-rules.md` to absolute path

3. **Delegate to visual-report-writer**:
   ```
   Agent(subagent_type: "vision-powers:visual-report-writer", prompt: {
     Analysis data: {plan extraction + codebase cross-reference + blast radius + verification results},
     template path (absolute path from step 2),
     font system path (absolute path from step 2),
     anti-slop rules path (absolute path from step 2),
     Output file path: {absolute output path},
     Output language: {detected language},
     Report title: "Plan Visual: {plan-name}",
     Aesthetic hint: "Blueprint" (or "Paper-ink" for narrative-heavy plans)
   })
   ```

4. **Report validation** — after the agent completes, Read the output HTML file and verify:
   - No unreplaced placeholders (`<!-- SECTION_`, `<!-- LANG -->`, `<!-- TITLE -->`, `<!-- TOC_CONTENT -->`, `<!-- CHART_DATA -->`)
   - Every `<section>` has meaningful content beyond just a heading
   - Mermaid `<pre class="mermaid">` blocks contain diagram syntax, not just placeholder comments
   - Chart.js data is populated (not empty object/array)

   If issues found, fix via Edit on the output file.

   If `mcp__claude-in-chrome__*` tools are available, also open `file://{output-path}` in Chrome via `tabs_create_mcp` + `navigate`, then use `javascript_tool` to check for Mermaid render errors and empty sections. Fix any issues found.

5. **Report completion**: Output the `file:///` URL to the user:
   ```
   Report generated: file://{absolute-path-to-report}
   ```

### Reference Files

- `../../templates/plan-visual.html` — HTML template with all CSS/JS baked in. Passed as path to visual-report-writer; the agent copies it to output and fills placeholders via Edit
- `../../references/design-system/font-system.md` — Font pairing selection guide. Passed as path to visual-report-writer; the agent reads it directly
- `../../references/design-system/anti-slop-rules.md` — Quality checklist for report writing. Passed as path to visual-report-writer; the agent reads it directly
