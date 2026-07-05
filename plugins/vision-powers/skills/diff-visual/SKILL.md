---
name: diff-visual
description: >
  Visualize git diffs as interactive HTML reports with architecture diagrams, change analysis,
  and side-by-side split-diff of the actual changed code. Use when asked to visualize, review, or
  summarize a diff, branch, commit, or PR — including seeing the real changed lines, not just a
  summary. Accepts branch names, commit hashes, HEAD, PR numbers, or commit ranges.
argument-hint: "<branch|commit|HEAD|#PR|range> [--format html|md] [--lang <code>] [--artifact (native design + publish)]"
allowed-tools: Read, Glob, Grep, AskUserQuestion, Artifact, Bash(git diff *), Bash(git log *), Bash(git show *), Bash(git rev-parse *), Bash(git branch *), Bash(wc -l *), Bash(gh pr diff *), Bash(gh pr view *), Bash(node *), Bash(open *), Bash(rm -rf /tmp/diff-visual-*)
---

# Diff Visual

Visualize git diffs as either self-contained interactive HTML reports (default) or inline markdown reports. HTML includes architecture diagrams, file maps, and change analysis. Markdown is the lighter alternative for terminal review or chat sharing. You write the output directly — no templates, no intermediate JSON, no agent chains.

## Instructions

### Format Detection

Parse `--format` first:

| Flag | Values | Default | Meaning |
|------|--------|---------|---------|
| `--format` | `html` \| `md` | `html` | `html` → full interactive dashboard at `${CLAUDE_PLUGIN_DATA}/reports/`. `md` → inline markdown report, delivered in the response |
| `--artifact` | switch | off | Publish the `html` dashboard as a claude.ai Artifact instead of a local file — see "HTML format — Artifact channel" below |

`--artifact` also triggers on natural-language equivalents — "as an artifact", "publish as a link",
"share as a URL" — without the literal flag, in whatever language the user is writing in. It applies
to `--format html` (the default) only. If combined with `--format md`, ignore it and use the normal
markdown response path below — publishing a diff-visual md report as-is is out of scope for this
slice (doc-visual's simpler single-file input validated that combination first; diff-visual's diff
scope makes it a separate follow-up, not a S3 requirement).

**Config precedence.** Before falling back to the defaults in the table, check stored preferences
once: `node ${CLAUDE_PLUGIN_ROOT}/scripts/config.js get` (prints the config as JSON, or `{}`). A
`default_format` value replaces the `html` default; `artifact: true` replaces off, the same as the
`--artifact` flag. Anything the user actually says this turn — a literal flag or a natural-language
equivalent — always overrides config; config only fills in when the request is silent on format/channel.

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
| **File Map** | Tree/nested diagram of changed files grouped by directory, each file carrying a **change-flag** (added / removed / modified / renamed) |
| **Key Changes** | Side-by-side **split-diff** of the load-bearing changed files — the actual code, not a summary. See below |
| **Architecture Impact** | How the change affects system structure — with diagram |
| **Change Classification** | Feature/refactor/test/docs/config breakdown table |
| **Dependency Shift** | Before/after imports, packages, connections — with diagram |
| **New Components** | Architecture diagram focused on new modules |
| **Hot Spots** | Impact vs frequency — quadrant chart or table |

Skip sections that don't apply to the diff (e.g., no "New Components" if nothing was added). **Key
Changes is the load-bearing section** for a code review — a reviewer wants the real lines first.
Place it high (right after File Map) and let it draw the eye; don't bury it under the diagrams.

**Key Changes (split-diff) — show the real code, grounded by extraction.** This is the one
section whose facts must never pass through your hands. When the diff contains meaningful code
hunks (most diffs do), render them as before/after split-diff — but the code comes from a script,
not from you:

1. **Auto-detect, no flag.** Turn the section on by content: if the diff has substantive code
   changes (not pure renames/deletions/binary/lockfiles), include Key Changes. Skip it for a
   trivial one-line change that reviews faster as plain text, or a diff that is all
   generated/vendored files.
2. **Select the load-bearing files** — 3–8 of them (budget in `structured-blocks.md`). These are
   the files a reviewer must read, not every touched file.
3. **Extract, never retype.** For each, get the verbatim escaped code from the bundled script:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/extract-hunks.js <scope> <file> [line-range]
   # PR with no local refs: gh pr diff <N> | node ${CLAUDE_PLUGIN_ROOT}/scripts/extract-hunks.js --stdin <file> [line-range]
   ```
   Paste its `<pre><code>` BEFORE/AFTER blocks into the split-diff layout **verbatim**. You write
   only the one-line summary (what the hunk does and why) and a few high-signal annotations —
   never the code itself. Retyping code drifts and mis-escapes; a confidently-wrong diff is worse
   than none in a review. (ADR 0005.)
4. **Layout, CDN, budgets, network-0 degrade** all live in
   `${CLAUDE_PLUGIN_ROOT}/references/design-system/structured-blocks.md` — read it before writing
   the section. One `<details>` per file (1–2 load-bearing files `open`, rest collapsed);
   highlight.js from CDN with the same first-view-needs-network caveat as Mermaid; un-highlighted
   monospace if offline.

In **markdown mode**, there is no CDN highlighting: render Key Changes as fenced ` ```diff ` blocks
(or per-file before/after fences) populated from `extract-hunks.js --json`, still extraction-grounded.

**File Map change-flags.** Tag each file in the File Map with its change type — added / removed /
modified / renamed — derived **mechanically** from `git diff {scope} --name-status` (the `A`/`D`/
`M`/`R` status letters), never guessed. Colour the flags from the `semantic-tokens.md` palette
(avoid the forbidden violet/fuchsia) and ensure they read in dark mode; reuse the same
`--diff-added`/`--diff-removed` convention `structured-blocks.md` defines, with `modified` on
`muted` and `renamed` on `link`. The flag is the footprint a reviewer scans before expanding
anything.

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
- **Split-diff** — do the before/after panes sit side by side and stay within their columns (`min-width:0`), or does a long code line blow out the grid? Is the code highlighted (or cleanly monospace if offline), not a raw unstyled wall? Are only the 1–2 load-bearing files `open`?

Fix what you see and re-render. **Cap at 2 audit passes** — if something still looks off after the second, ship with a one-line note to the user rather than looping. This catches gross breakage, not pixel-perfection.

**If Chrome is absent**, `render-report.js` exits `1` (non-zero). Skip the audit and tell the user it was skipped (e.g. "rendered-image check skipped: Chrome not found — set `CHROME_BIN` or install Chrome"). The report already passed the gate; the visual pass is an enhancement and **never blocks delivery**.

Full procedure, limits (fixed-height clipping, downscaling, render cost), and the rationale for *not* mechanizing this with a measurement script live in `${CLAUDE_PLUGIN_ROOT}/references/design-system/visual-self-audit.md`.

Then run `open <output-path>`.

#### HTML mode — Artifact channel (`--artifact`)

Same content decisions as the default HTML mode above (report structure, section-to-diagram
mapping, split-diff, anti-slop-tells) — only the page's shape and delivery mechanism change,
because it ships inside Claude Code's official Artifacts feature instead of as a local file.

**Before writing anything**, load the built-in `artifact-design` skill (Skill tool, skill name
`artifact-design`). This is a tool contract MUST, not a suggestion — it conditions you for the CSP
sandbox this page runs in, and skipping it is how a page ends up broken on publish.

Then write the page as a **fragment**, not a full document:
- No `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags — content only, starting from your first
  real element. The Artifact tool wraps the file in that skeleton at publish time.
- Set a concise `<title>` directly in the content — it names the artifact in the browser tab. Keep
  it stable across every republish of the same diff in this session.
- **Zero external requests** — the Artifact viewer's CSP blocks all of them:
  - **Diagrams**: no Mermaid CDN `<script>`. Architecture Impact, Dependency Shift, New Components,
    and Hot Spots become inline SVG or HTML+CSS layouts instead (follow the artifact-design skill's
    guidance) — same diagram-type decision from `diagram-type-selection.md`, different rendering
    technique. `mermaid-patterns.md`'s CDN setup and `classDef` rules don't apply here.
  - **Key Changes / split-diff**: no highlight.js CDN either — symmetric with the Mermaid ban. Read
    `${CLAUDE_PLUGIN_ROOT}/references/design-system/structured-blocks.md`'s "Artifact channel: no
    CDN, forced degrade" subsection before writing this section: the code always renders as clean
    monospace, never coloured, and the fallback CSS must use this page's own colours (not
    vision-powers' `--paper-2`/`--ink`/`--mono` tokens, which don't exist here). The grounding law
    doesn't change — `extract-hunks.js` output is still pasted verbatim; only the CSS around it does.
- Support both themes: `@media (prefers-color-scheme: dark)` as the default signal, plus
  `:root[data-theme="dark"]` / `:root[data-theme="light"]` overrides — the artifact viewer's theme
  toggle stamps `data-theme` on the root and it must win in both directions.

Save the fragment to `${CLAUDE_PLUGIN_DATA}/reports/{scope}-diff-visual.artifact.html` — a distinct
filename from the default channel's output, so the two never collide or overwrite each other for
the same scope. Re-running this skill on the same scope within the same conversation reuses that
same path; publishing to the same `file_path` again redeploys to the same URL instead of minting a
new one, so keep the `<title>` and `favicon` identical across those republishes (the tool reads a
changed favicon as a different page). If `${output-path}.artifact.json` already exists from an
earlier publish this session, read it first and reuse its `title`/`favicon` verbatim.

**Validation**: run the gate in content-only mode instead of the full check:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-gate.js <output-path> --content-only
```
This checks only missing images, raw markdown leakage, anchor hrefs, image alt, and placeholders —
the facts that must survive regardless of who designed the page. Density/classDef/palette checks
don't apply: the built-in artifact-design skill owns the design layer on this channel (ADR 0007).

**Skip the visual self-audit (render-report.js) entirely on this channel.** The rendered picture is
the built-in artifact-design skill's responsibility here, not this skill's — there's no local
Chrome render loop to run before publishing.

**Size headroom**: a large single-file diff (1483 changed lines, extracted 2026-07-06) measured
~44 bytes/line through `extract-hunks.js`, so a split-diff section that keeps to the budget above
(3–8 files, ≤150 lines each) lands in the tens-to-low-hundreds of KB — hundreds of times under the
platform's 16 MiB artifact render ceiling. The ceiling is only reachable by ignoring the budget
(e.g. pasting a whole large diff verbatim instead of the load-bearing hunks); no extra size-limiting
logic is needed as long as the section stays inside it.

Once the gate passes, publish — see "Publish (`--artifact`)" below.

#### Markdown mode (`--format md`)

Assemble an inline markdown report and deliver it directly in the response, and save the same
content to `${CLAUDE_PLUGIN_DATA}/reports/{scope}-diff-visual.md` — the chat text is the delivery,
the file is the record that lets report-manager list and refine this report later. Use this structure:

```
# Diff Visual: <scope description>

**Scope:** `<git ref or range>` · **Audience:** <audience> · **Focus:** <focus>

## Overview
- **Commits:** N
- **Files changed:** N (M new · P deleted)
- **Lines:** +A / −B

## File Map
<tree/nested diagram of changed files grouped by directory, each file tagged
 [A]/[D]/[M]/[R] from --name-status>

## Key Changes
<for the 3-8 load-bearing files: a ```diff fenced block per file populated from
 `extract-hunks.js --json` (extraction-grounded — never retyped), each under a
 one-line summary of what the hunk changes and why>

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

### Publish (`--artifact`)

After the content-only gate passes (see "HTML mode — Artifact channel" above):

1. Publish with the `Artifact` tool: `file_path` = the fragment you saved, `favicon` = one or two
   emoji fitting the diff's scope (reused unchanged if a sidecar from this session already set
   one — see above), `description` = one sentence on what changed.
2. Record the publish so a later refine (even across sessions, once that lands) can find this URL:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/write-artifact-sidecar.js --report <output-path> --url <artifact-url> --title <title> --favicon <favicon>
   ```
3. Report the URL to the user with one line noting the design delegation — e.g. "Design delegated
   to Claude's built-in Artifact renderer — this differs from the local report's look." (phrase it
   in whatever language you're already replying in).

**Fallback** — if the `Artifact` tool is unavailable or the publish call fails: keep the local
fragment you already saved, `open` it as the default HTML channel does, and state the fallback in
one generic line (e.g. "Artifact publish unavailable — opened the local file instead."). Don't
guess at the specific cause, and don't ask before falling back.

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
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/structured-blocks.md` | Before writing the Key Changes split-diff section (layout, highlight.js CDN, budgets, grounding, degrade — including the Artifact-channel no-CDN variant) |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/semantic-tokens.md` | When setting up CSS custom properties and Mermaid theme |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-type-selection.md` | When deciding diagram type for a section |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/diagram-density-rules.md` | When a diagram feels complex |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/anti-slop-tells.md` | While shaping content — to check you're not falling into a behavioral-slop reflex |
| `${CLAUDE_PLUGIN_ROOT}/references/design-system/visual-self-audit.md` | After the gate passes — the render-and-look loop (full procedure) |
