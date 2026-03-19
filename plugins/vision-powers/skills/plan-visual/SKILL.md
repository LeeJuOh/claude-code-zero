---
name: plan-visual
description: >
  Review implementation plans as interactive HTML reports with architecture
  diagrams, blast radius analysis, risk assessment, and gap detection.
  Use when asked to review, visualize, evaluate, assess, or critique an
  implementation plan — including phrases like "이 플랜 괜찮아?", "check my plan",
  "is this plan feasible", "review the implementation plan", or "what could go
  wrong with this plan". Accepts plan file paths or reads from the current
  Claude Code plan.
argument-hint: "<plan-file-path> [codebase-path] [--lang <code>]"
allowed-tools: Read, Glob, Grep, Agent, AskUserQuestion, Bash(wc -l *), Bash(node *), Bash(open *), Bash(rm -rf /tmp/plan-visual-*)
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

1. **Explicit argument**: `--lang <code>` (e.g., `--lang ko`, `--lang fr`, `--lang zh`) → use that language. Any language code is valid
2. **User message text**: Detect the language of the message (excluding path) and match it
   - Examples: 한글 → Korean, 日本語 → Japanese, "en español" → Spanish, "auf Deutsch" → German
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

Follow `../../references/report-generation-workflow.md` with these parameters:

| Parameter | Value |
|-----------|-------|
| `{output-path}` | `~/.claude-code-zero/vision-powers/reports/{plan-name}-plan-visual.html` — where `{plan-name}` is from the plan file name (e.g., `auth-redesign`) |
| `{template-name}` | `plan-visual.html` |
| `{skill-prefix}` | `plan-visual` |
| `{expected-sections}` | `9` |
| `{report-title}` | `"Plan Visual: {plan-name}"` |
| `{aesthetic-hint}` | `"Blueprint"` (or `"Paper-ink"` for narrative-heavy plans) |
| `{agent-prompt-data}` | Plan extraction + codebase cross-reference + blast radius + verification results |

### Gotchas

- **Unstructured plan files**: Not all plans follow a clear format. Some are freeform notes, Slack thread dumps, or stream-of-consciousness. Extract what structure you can — problem/changes/decisions — but don't fabricate structure that isn't there. Flag gaps as "Understanding Gaps" in the report.
- **Plan references deleted files**: Plans written days ago may reference files that have since been modified, renamed, or deleted. Always verify file existence before asserting the plan's assumptions hold. Note any drift between plan and current codebase.
- **No active Claude Code plan**: `~/.claude/plans/` may be empty or not exist. This is normal for users who don't use Claude Code's plan feature. Inform the user and ask for a direct file path.
- **Circular dependencies in blast radius**: Tracing import dependents can lead to cycles (A imports B imports C imports A). Cap the dependency tracing depth at 3 levels to avoid infinite loops.
- **Plans with no codebase context**: Some plans describe greenfield projects with no existing code. The "Codebase Cross-Reference" phase produces nothing useful — skip it and focus the report on the plan's internal consistency and risk assessment.

### Reference Files

- `../../references/report-generation-workflow.md` — Shared report generation steps (resolve paths, delegate, assemble, validate, cleanup)
- `references/section-structure.md` — HTML structure patterns for each report section
