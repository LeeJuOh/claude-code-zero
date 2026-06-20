---
name: diff-visual
description: >
  Visualize git diffs as interactive HTML reports with architecture diagrams and change analysis.
  Use when asked to visualize, review, or summarize a diff, branch, commit, or PR.
  Accepts branch names, commit hashes, HEAD, PR numbers, or commit ranges.
argument-hint: "<branch|commit|HEAD|#PR|range> [--format html|md] [--lang <code>]"
allowed-tools: Read, Glob, Grep, AskUserQuestion, Bash(git diff *), Bash(git log *), Bash(git show *), Bash(git rev-parse *), Bash(git branch *), Bash(wc -l *), Bash(gh pr diff *), Bash(gh pr view *), Bash(node *), Bash(open *), Bash(rm -rf /tmp/diff-visual-*)
---

# Diff Visual

Visualize git diffs as either self-contained interactive HTML reports (default) or inline markdown reports. HTML includes architecture diagrams, file maps, and change analysis. Markdown is the lighter alternative for terminal review or chat sharing. You write the output directly — no templates, no intermediate JSON, no agent chains.

## Instructions

### Format Detection

Parse `--format` first:

| Flag | Values | Default | Meaning |
|------|--------|---------|---------|
| `--format` | `html` \| `md` | `html` | `html` → full interactive dashboard at `${CLAUDE_PLUGIN_DATA}/reports/`. `md` → inline markdown report, delivered in the response |

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

Write the entire HTML file yourself — `<!DOCTYPE html>` to `</html>`. A self-contained single file with inline CSS and scripts.

**Report structure** — adapt based on the diff's content, but this is the default section set:

| Section | Content |
|---|---|
| **Overview** | Commits, files changed, lines +/−, scope description |
| **File Map** | Tree/nested diagram of changed files grouped by directory |
| **Architecture Impact** | How the change affects system structure — with diagram |
| **Change Classification** | Feature/refactor/test/docs/config breakdown table |
| **Dependency Shift** | Before/after imports, packages, connections — with diagram |
| **New Components** | Architecture diagram focused on new modules |
| **Hot Spots** | Impact vs frequency — quadrant chart or table |

Skip sections that don't apply to the diff (e.g., no "New Components" if nothing was added).

**Diagrams**: Read these reference files for implementation:
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/mermaid-patterns.md` — Mermaid syntax, theming, dark mode, zoom
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md` — Color/font roles, Mermaid themeVariables
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md` — 13-type selection guide
- `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md` — Complexity budgets

Key diagram rules (always apply):
1. Max 9 nodes, 12 arrows per diagram. Over budget → split
2. 1-2 focal accents only
3. No `rgba()` or `color:` in Mermaid classDef — parser breaks
4. No violet/fuchsia "AI purple" hexes (`#8b5cf6`/`#7c3aed`/`#a78bfa`/`#d946ef`) — the gate fails on these
5. Always `theme: 'base'` with themeVariables from semantic-tokens
6. Table > diagram when a 3-column table conveys it equally well

The gate also fails on dead links, alt-less images, and leftover scaffolding: give every `<a>` a real href, every `<img>` an `alt` (`alt=""` if decorative), and leave no `{{ }}`/lorem/`[STUB]` placeholders.

**CSS essentials**: Write your own CSS inline. Must support:
- `prefers-color-scheme: dark` via CSS custom properties
- Korean font stack (CJK font in font-family)
- `transform: scale()` for Mermaid zoom (not `zoom` property)
- `min-width: 0` on flex/grid children
- `prefers-reduced-motion: reduce`

**Content integrity**: Every number, file path, function name, and behavioral claim in the report must trace back to the verified fact sheet. If you're writing "this change affects X" — that must be in your fact sheet. Numbers must match git output exactly.

Beyond integrity, seven authoring reflexes pass every mechanical gate and still flatten the output — summary-leak (a one-line gist where the diff's actual changes belong), linear dump (file-by-file with no proportion), forced diagram (a flowchart for a change classification a table conveys better), generic label, uniform density, empty decoration, accent overuse. Read `${CLAUDE_PLUGIN_ROOT}/references/design-system/anti-slop-tells.md` for the full catalogue. They're named defaults to break, not design rules: layout and taste stay yours — the catalogue just flags the habits worth resisting (e.g. let the load-bearing hot spot draw the eye first, don't render the dependency shift and a two-line aside at the same weight).

**Output path**: `${CLAUDE_PLUGIN_DATA}/reports/{scope}-diff-visual.html` — where `{scope}` is sanitized from the input (e.g., `feature-auth`, `abc1234`, `pr-123`, `HEAD`).

**Validation**: After writing the HTML, run artifact-gate:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-gate.js <output-path>
```
If violations found: fix inline, max 2 retries.

**Visual self-audit (HTML only)**: The gate reads the HTML as *text* — it never sees the rendered picture. A file-map tree can pass the density check and still render as an unreadable tangle; a long file path can clip at the container edge; the hot-spots quadrant that reads fine in source can collapse into a flat wall once styled. After the gate passes, **render the report and look at it** before delivering:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-report.js <output-path>
```

On success it prints a PNG path. **Read that PNG** (you read images multimodally) and scan it for what the text gate can't judge:

- **Density** — is any section a uniform grey wall, or a file-map / dependency-shift diagram past its budget and unreadable?
- **Hierarchy** — does the change you judged load-bearing draw the eye first, or is every section the same weight? (see *uniform density* / *accent overuse* in anti-slop-tells.md)
- **Mermaid integrity** — did the file map, dependency-shift subgraphs, or hot-spots quadrant render as raw `<pre>` text or as crossing/overlapping edges?
- **Overflow** — does a diagram, classification table, or long file path run past its container or off the page?

Fix what you see and re-render. **Cap at 2 audit passes** — if something still looks off after the second, ship with a one-line note to the user rather than looping. This catches gross breakage, not pixel-perfection.

**If Chrome is absent**, `render-report.js` exits `1` (non-zero). Skip the audit and tell the user it was skipped (e.g. "rendered-image check skipped: Chrome not found — set `CHROME_BIN` or install Chrome"). The report already passed the gate; the visual pass is an enhancement and **never blocks delivery**.

Full procedure, limits (fixed-height clipping, downscaling, render cost), and the rationale for *not* mechanizing this with a measurement script live in `${CLAUDE_PLUGIN_ROOT}/references/design-system/visual-self-audit.md`.

Then run `open <output-path>`.

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

Read these during report generation (not upfront — read the relevant one when you need it):

| File | When to read |
|---|---|
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/mermaid-patterns.md` | Before writing any Mermaid diagram |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md` | When setting up CSS custom properties and Mermaid theme |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md` | When deciding diagram type for a section |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md` | When a diagram feels complex |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/anti-slop-tells.md` | While shaping content — to check you're not falling into a behavioral-slop reflex |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/visual-self-audit.md` | After the gate passes — the render-and-look loop (full procedure) |
