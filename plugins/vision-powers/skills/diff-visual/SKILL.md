---
name: diff-visual
description: >
  Visualize git diffs as interactive HTML reports with architecture diagrams,
  file maps, and change analysis. Use when asked to visualize, review, explain,
  or summarize a diff, branch, commit, PR, or set of changes — including phrases
  like "what changed", "show me the changes", "review this PR visually",
  or "make a visual diff report". Accepts branch names, commit hashes, HEAD,
  PR numbers, or commit ranges.
argument-hint: "<branch|commit|HEAD|#PR|range> [--format html|md] [--lang <code>]"
allowed-tools: Read, Glob, Grep, Agent, AskUserQuestion, Bash(git diff *), Bash(git log *), Bash(git show *), Bash(git rev-parse *), Bash(git branch *), Bash(wc -l *), Bash(gh pr diff *), Bash(gh pr view *), Bash(node *), Bash(open *), Bash(rm -rf /tmp/diff-visual-*)
---

# Diff Visual

Visualize git diffs as either self-contained interactive HTML reports (default) or inline markdown reports. HTML includes architecture diagrams, file maps, and change analysis. Markdown is the lighter alternative for terminal review or chat sharing.

## Instructions

### Format Detection

Parse `--format` first:

| Flag | Values | Default | Meaning |
|------|--------|---------|---------|
| `--format` | `html` \| `md` | `html` | `html` → full interactive dashboard at `${CLAUDE_PLUGIN_DATA}/reports/`. `md` → inline markdown report, delivered in the response |

**Principle:** HTML is the default because visual reporting is the point of this skill. Only choose `md` when the user explicitly asks for markdown, when running in a non-browser context (cowork, headless CI), or when the user wants something they can paste into a PR description or chat.

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
   - Examples: Korean text → Korean, Japanese text → Japanese, "en español" → Spanish, "auf Deutsch" → German
3. **Ref-only with no other text**: Default to English

### Intent Check

*Why: Understanding the audience and focus area upfront lets the report emphasize what matters most — a code review for a teammate reads differently from an architecture briefing for stakeholders.*

If the user's message already conveys clear intent (specific focus, explicit audience, or detailed request), skip this step and proceed with defaults.

If the request is ambiguous (e.g., just a branch name with no context), use AskUserQuestion to ask up to 2 questions:

1. **Audience**: Who will read this? (yourself, your team, stakeholders)
2. **Focus**: Any specific aspect to emphasize? (architecture impact, migration completeness, general)

Defaults (when not specified):
- Audience: the user themselves
- Focus: balanced coverage across all sections

Pass audience and focus context to the report generation phase to adjust section depth and emphasis.

### Data Gathering

*Why: Reading actual file contents (not just diff hunks) is essential for accurate architecture diagrams and code review assessments.*

Collect comprehensive data about the diff. Run git commands in parallel where possible.

**Step 1 — Stats and metadata** (parallel):
```
git diff {scope} --stat
git diff {scope} --name-status
git log {scope-log-range} --oneline --format="%h %s"
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

**Step 3 — Content analysis**:
Read the full diff content and changed files to understand:
- **Architecture changes**: New modules, changed imports/exports, dependency shifts
- **Feature inventory**: What features were added/modified/removed
- **API surface changes**: New/changed public functions, types, endpoints

Use Glob + Grep to find related files (tests, configs, docs) that provide context.

**CRITICAL**: Read actual changed file contents — do not rely solely on diff hunks. Understanding the full file context is essential for accurate architecture diagrams and code review.

### Verification Checkpoint

*Why: Every claim in the report must be traceable to actual git output. This step catches hallucinated metrics before they enter the report.*

Before generating the report, **produce a structured fact sheet** listing every claim you will present:

1. **Quantitative check**: Lines +/−, file counts, module counts — all must match git output exactly
2. **Name check**: Every function name, type name, file path mentioned must exist in the actual diff
3. **Behavior check**: Every behavioral description must be traceable to specific code changes
4. **Source citation**: For each claim in the analysis, identify the source (commit hash, file:line, diff hunk)

If any claim cannot be sourced, remove it or mark it as uncertain.

### Report Generation

Use extended thinking for the analysis above. The depth of analysis directly determines report quality.

Branch on `--format`:

#### HTML mode (default)

Follow `../../references/report-generation-workflow.md` with these parameters:

| Parameter | Value |
|-----------|-------|
| `{output-path}` | `${CLAUDE_PLUGIN_DATA}/reports/{scope}-diff-visual.html` — where `{scope}` is sanitized from the input (e.g., `feature-auth`, `abc1234`, `pr-123`, `HEAD`) |
| `{template-name}` | `diff-visual.html` |
| `{skill-prefix}` | `diff-visual` |
| `{expected-sections}` | `7` |
| `{report-title}` | `"Diff Visual: {scope description}"` |
| `{aesthetic-hint}` | `"Editorial"` (or `"Blueprint"` for infrastructure-heavy diffs) |
| `{agent-prompt-data}` | All gathered data: stats, metrics, architecture, features |

#### Markdown mode (`--format md`)

Assemble an inline markdown report and deliver it directly in the response. Do NOT write to disk — markdown mode is intentionally ephemeral. Use this structure:

```
# Diff Visual: <scope description>

**Scope:** `<git ref or range>` · **Audience:** <audience> · **Focus:** <focus>

## Overview
- **Commits:** N
- **Files changed:** N (M new · P deleted)
- **Lines:** +A / −B

## File Map
<tree/nested diagram of changed files grouped by directory>

## Architecture Impact
<1-2 paragraphs + architecture diagram>

## Change Classification
| Category | % | Files |
|---|---|---|

## Dependency Shift
<before/after side-by-side subgraph Mermaid>

## New Components
<architecture diagram focused on new modules>

## Hot Spots
<quadrant: impact vs frequency>
```

**Translation:** Translate section headers and prose to the detected language. Keep file paths, function names, commit hashes, and technical classifications (feature/refactor/test/docs/config) untranslated.

**Length cap:** Keep the markdown report under 300 lines. If data exceeds this, truncate with `(+N more)` notes rather than expanding the report.

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
