---
name: diff-visual
description: >
  Visualize git diffs as interactive HTML reports with architecture diagrams,
  KPI dashboards, code review cards, and side-by-side comparisons.
  Use when asked to visualize, review, explain, or summarize a diff, branch,
  commit, PR, or set of changes — including phrases like "what changed",
  "show me the changes", "코드 변경 내용 보여줘", "review this PR visually",
  or "make a visual diff report". Accepts branch names, commit hashes, HEAD,
  PR numbers, or commit ranges.
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

Follow `../../references/report-generation-workflow.md` with these parameters:

| Parameter | Value |
|-----------|-------|
| `{output-path}` | `${CLAUDE_PLUGIN_DATA}/reports/{scope}-diff-visual.html` — where `{scope}` is sanitized from the input (e.g., `feature-auth`, `abc1234`, `pr-123`, `HEAD`) |
| `{template-name}` | `diff-visual.html` |
| `{skill-prefix}` | `diff-visual` |
| `{expected-sections}` | `10` |
| `{report-title}` | `"Diff Visual: {scope description}"` |
| `{aesthetic-hint}` | `"Editorial"` (or `"Blueprint"` for infrastructure-heavy diffs) |
| `{agent-prompt-data}` | All gathered data: stats, metrics, architecture, features, code review, decisions |

### Gotchas

- **Three-dot vs two-dot range**: `git diff a..b` shows all changes between a and b. `git diff a...b` shows changes on b since it diverged from a. Users often say "compare branches" meaning `...` (three-dot). When in doubt, use three-dot for branch comparisons and two-dot for commit ranges.
- **Detached HEAD or no base branch**: Some repos don't have a `main` or `master` branch. The fallback `git rev-parse --verify main || master` fails silently. If both fail, ask the user for the base branch name.
- **Empty diff for uncommitted changes**: `git diff HEAD` returns nothing when there are no uncommitted changes. This is a valid state — inform the user rather than generating an empty report.
- **PR diff requires `gh` auth**: `gh pr diff` needs authentication. If it fails with 401/403, suggest `gh auth login` rather than falling back to a different approach silently.
- **Binary files in diff**: `git diff --stat` counts binary files but `--numstat` shows `-` for their line counts. Don't report binary file "lines added/removed" — note them separately as binary changes.
- **Very large diffs (>5000 lines)**: Reading the full diff content can overwhelm context. Focus on the `--stat` summary and read only the most architecturally significant changed files in full.

### Reference Files

- `../../references/report-generation-workflow.md` — Shared report generation steps (resolve paths, delegate, assemble, validate, cleanup)
- `references/section-structure.md` — HTML structure patterns for each report section
