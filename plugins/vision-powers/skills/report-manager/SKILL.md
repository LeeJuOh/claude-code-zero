---
name: report-manager
description: >
  Manage and refine vision-powers reports: list, open, delete, search, and refine sections.
  Use when asked to list, open, delete, search, or update generated HTML reports.
argument-hint: "<list|open|delete|search|refine> [filter] [--all]"
allowed-tools: Read, Glob, Grep, Edit, AskUserQuestion, Artifact, Bash(ls *), Bash(rm *), Bash(open *), Bash(node *)
---

# Report Manager

Manage vision-powers reports — every persisted output (`.html`, `.artifact.html`, `.md`,
`.artifact.md`): list, open, delete, search, and refine sections.

## Paths

| Resource | Path |
|----------|------|
| Reports directory | `${CLAUDE_PLUGIN_DATA}/reports/` |
| Plugin scripts | `${CLAUDE_SKILL_DIR}/../../scripts/` |

## Operation Detection

Determine the operation from `$ARGUMENTS`:

| Keywords | Operation |
|----------|-----------|
| list, show, reports, ls | `list` |
| open, view, browse | `open` |
| delete, remove, clean, prune | `delete` |
| search, find, grep | `search` |
| refine, fix, update, adjust, change section | `refine` |

Default to `list` if ambiguous.

## list

Single call — returns structured JSON:
```
node ${CLAUDE_SKILL_DIR}/../../scripts/list-reports.js --data-dir "${CLAUDE_PLUGIN_DATA}"
```

Output contains `reports_dir`, `count`, and `reports[]` (each with `index`, `filename`, `path`, `type`, `size`, `date`, and `artifact_url` when a `<report>.artifact.json` sidecar exists).

Format as a numbered table with clickable links. Add an `Artifact` column only when at least one report in the list has `artifact_url` (omit the column entirely otherwise — most reports won't have one):

```
| # | Report | Type | Size | Date | Artifact |
|---|--------|------|------|------|----------|
| 1 | [filename](file:///absolute/path) | type | size | date | [Open](artifact_url) |
| 2 | [filename](file:///absolute/path) | type | size | date | — |
```

## open

1. **No argument**: open the most recent report
2. **Number**: Nth from list output
3. **Partial name**: glob match `${CLAUDE_PLUGIN_DATA}/reports/*{arg}*.{html,md}`

```bash
open <resolved-absolute-path>
```

Print the `file:///` URL for reference. If the resolved report's `list-reports.js` entry has `artifact_url`, also print that as "Shared link: <url>".

## delete

**Always confirm with AskUserQuestion before deleting.**

Filters:
- Specific file: filename or number from list
- Type: `--type diff-visual`
- Age: `--before 30d`
- All: `--all`

Steps:
1. Resolve matching files (use `list-reports.js` output or ls)
2. Show files that will be deleted (filename, size, date)
3. Confirm via AskUserQuestion — "Delete N files" / "Cancel"
4. `rm` each file on confirmation, **and its `<file>.artifact.json` sidecar if one exists** — an orphaned sidecar would make a future `list` claim a shared link for a report that's gone
5. Report count deleted

## search

1. **Filename**: Glob `${CLAUDE_PLUGIN_DATA}/reports/*{query}*.{html,md}`
2. **Content**: Grep inside the reports for the query — in HTML focus on `<title>`, `<h1>`–`<h3>`,
   and text nodes; in markdown, headings and body text
3. Display results with clickable `file://` links

## refine

Surgically edit a section of an existing report without full regeneration.

*Why: Full regeneration re-rolls fonts, colors, and all content. Targeted edits preserve what works.*

1. **Resolve target report**: filename, number, partial name, or most recent if none given. **Check for a sidecar**: `<report-path>.artifact.json` — its presence means this file is an Artifact-channel file published to claude.ai (an `.artifact.html` fragment or an `.artifact.md`), not a plain local report. This changes steps 5–7 below.
2. **Identify section**: If the user's message names specific sections, use those; otherwise Read the report, list `<section id="...">` headings, and use AskUserQuestion to let the user pick
3. **Gather context**: If the requested change references source code or git data, use Grep/Read to get correct info
4. **Apply edit**: Read the target section, use Edit to modify it. Preserve HTML structure, CSS classes, and Mermaid/Chart.js formatting. Do not touch other sections.
   - When you re-author the section's *content* (not just patch a value), don't reintroduce behavioral slop. Read `${CLAUDE_SKILL_DIR}/../../references/design-system/anti-slop-tells.md` for the named defaults to break.
5. **Validate**:
   ```
   node ${CLAUDE_SKILL_DIR}/../../scripts/artifact-gate.js <report-path> [--content-only]
   ```
   Pass `--content-only` when step 1 found a sidecar (or the filename ends in `.artifact.html`) — design-layer checks (density, palette, font fallback, Mermaid classDef) don't apply to a page whose design is owned by the built-in `artifact-design` skill. If violations found, fix inline and re-validate (max 2 retries).
   **Markdown reports (`.md` / `.artifact.md`) skip this script entirely** — `artifact-gate.js` parses HTML only and would false-flag markdown's own `##`/`**` syntax as leakage. Give the edited markdown the generating skills' hand-check instead: no leftover `{{ }}`/`[STUB]`/lorem placeholder tokens, and every link resolves.
6. **Visual self-audit (local HTML reports only)**: skip it for markdown reports and for Artifact-channel fragments — a local render of a fragment lacks the wrapper claude.ai adds, and `artifact-design` owns their look. For local HTML reports, follow `${CLAUDE_SKILL_DIR}/../../references/design-system/visual-self-audit.md` on the edited section, rendering with:
   ```
   node ${CLAUDE_SKILL_DIR}/../../scripts/render-report.js <report-path> --data-dir "${CLAUDE_PLUGIN_DATA}"
   ```
7. **Republish (Artifact-channel files only — `.artifact.html` / `.artifact.md`)**: skip this step for local reports — nothing to publish. If step 1 found a sidecar, read it for `url` and `title`, then call the `Artifact` tool with `file_path=<report-path>`, `url=<sidecar url>`, and a `description` — passing `url` is what stacks the edit onto the **same** claude.ai link instead of minting a new one; a fresh session has no other way to target an existing artifact (this is exactly the gap a missing `url` arg leaves open). After a successful publish, rewrite the sidecar (`node ${CLAUDE_SKILL_DIR}/../../scripts/write-artifact-sidecar.js --report <report-path> --url <url> --title <title>`) so `published_at` reflects this refine.
   - **No sidecar, but the filename still ends in `.artifact.html` or `.artifact.md`**: this file was never successfully published (an earlier attempt fell back to local-only). Publish fresh — omit `url` — and write the sidecar for the first time.
   - **Sidecar present but the republish call errors** (the link died, e.g. the artifact was deleted upstream): publish fresh — omit `url` — write a new sidecar over the old one, and tell the user in one line: "New shared link published — any previously shared link now points to a stale version." Don't guess at *why* the old link died.
8. **Report**: Print the `file://` URL (local reports) or the claude.ai URL (Artifact-channel fragments), summarize what changed

## Gotchas

- **Report type detection is filename-based**: `*-diff-visual` → diff-visual, `*-doc-visual` → doc-visual, `*-report` → plugin-visual.
- **A local report and its Artifact-channel fragment are two separate files** (e.g. `2026-07-06-x-doc-visual.html` vs `2026-07-06-x-doc-visual.artifact.html`) with independently designed content — refining one never touches the other. A partial-name match in step 1 of refine can hit both; if the resolved list has more than one candidate, ask which one rather than guessing.
