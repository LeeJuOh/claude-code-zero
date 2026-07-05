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
| Reports directory | `$CLAUDE_PLUGIN_DATA/reports/` (shell env var — use in Bash commands) |
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
node ${CLAUDE_SKILL_DIR}/../../scripts/list-reports.js
```

Output contains `reports_dir`, `count`, and `reports[]` (each with `index`, `filename`, `path`, `type`, `size`, `date`, and `artifact_url` when a `<report>.artifact.json` sidecar exists — issue 007 S4.5).

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
3. **Partial name**: glob match `$CLAUDE_PLUGIN_DATA/reports/*{arg}*.{html,md}`

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
4. `rm` each file on confirmation, **and its `<file>.artifact.json` sidecar if one exists** — an orphaned sidecar would make a future `list` claim a shared link for a report that's gone (issue 007 S4.5)
5. Report count deleted

## search

1. **Filename**: Glob `$CLAUDE_PLUGIN_DATA/reports/*{query}*.{html,md}`
2. **Content**: Grep inside the reports for the query — in HTML focus on `<title>`, `<h1>`–`<h3>`,
   and text nodes; in markdown, headings and body text
3. Display results with clickable `file://` links

## refine

Surgically edit a section of an existing report without full regeneration.

*Why: Full regeneration re-rolls fonts, colors, and all content. Targeted edits preserve what works.*

1. **Resolve target report**: filename, number, partial name, or most recent if none given. **Check for a sidecar**: `<report-path>.artifact.json` — its presence means this file is an Artifact-channel file published to claude.ai (an `.artifact.html` fragment or an `.artifact.md`), not a plain local report. This changes steps 6–8 below (issue 007 S4.5).
2. **Harvest in-browser feedback (optional, see "Feedback harvesting" below)**: if the user has been leaving notes via the ✎ UI, read them before asking for more
3. **Identify section**: If feedback (from step 2 or user message) names specific sections, use those. Otherwise parse from message; if still ambiguous, Read the report, list `<section id="...">` headings, and use AskUserQuestion to let the user pick
4. **Gather context**: If feedback references source code or git data, use Grep/Read to get correct info
5. **Apply edit**: Read the target section, use Edit to modify it. Preserve HTML structure, CSS classes, `style="--i: N"` values, and Mermaid/Chart.js formatting. Do not touch other sections.
   - When you re-author the section's *content* (not just patch a value), don't reintroduce behavioral slop. Read `${CLAUDE_SKILL_DIR}/../../references/design-system/anti-slop-tells.md` for the catalogue of named defaults to break — summary-leak, linear dump, forced diagram, generic label, uniform density, empty decoration, accent overuse. They're reflexes to resist, not a layout to apply: taste and structure stay yours.
6. **Validate**:
   ```
   node ${CLAUDE_SKILL_DIR}/../../scripts/artifact-gate.js <report-path> [--content-only]
   ```
   Pass `--content-only` when step 1 found a sidecar (or the filename ends in `.artifact.html`) — design-layer checks (density, palette, font fallback, Mermaid classDef) don't apply to a page whose design is owned by the built-in `artifact-design` skill, only the local channel's own CSS is checked against those (issue 007, ADR 0007). If violations found, fix inline and re-validate (max 2 retries).
   **Markdown reports (`.md` / `.artifact.md`) skip this script entirely** — `artifact-gate.js` parses HTML only and would false-flag markdown's own `##`/`**` syntax as leakage. Give the edited markdown the generating skills' hand-check instead: no leftover `{{ }}`/`[STUB]`/lorem placeholder tokens, and every link resolves.
7. **Visual self-audit (local HTML reports only)**: The gate reads the HTML as *text* — it never sees the rendered picture, so a re-authored section can pass the gate and still render as a tangled diagram, a clipped label, or a flat grey wall. Skip this step entirely for markdown reports (nothing to render) and for Artifact-channel fragments (step 1's sidecar case) — the fragment on disk is missing the `<head>`/theme wrapper claude.ai adds at publish time, so a local Chrome render of it wouldn't reflect what actually ships; the built-in `artifact-design` skill owns their visual quality, not this audit. For local HTML reports, after the gate passes, render the report and look at it:
   ```
   node ${CLAUDE_SKILL_DIR}/../../scripts/render-report.js <report-path>
   ```
   On success it prints a PNG path. **Read that PNG** (you read images multimodally) and scan it for what the text gate can't judge:
   - **Density** — is the edited section a uniform grey wall, or a diagram past its budget and unreadable?
   - **Hierarchy** — does anything draw the eye first, or is every section the same weight?
   - **Mermaid integrity** — did a diagram render as raw `<pre>` text or as crossing/overlapping edges?
   - **Overflow** — does a diagram, table, or label run past its container or off the page?

   Fix what you see and re-render — **cap at 2 audit passes**, then ship with a one-line note rather than looping. **If Chrome is absent**, `render-report.js` exits non-zero; skip the audit and tell the user it was skipped (e.g. "rendered-image check skipped: Chrome not found — set `CHROME_BIN` or install Chrome"). The visual pass is an enhancement and **never blocks** delivery. Full procedure: `${CLAUDE_SKILL_DIR}/../../references/design-system/visual-self-audit.md`.
8. **Republish (Artifact-channel files only — `.artifact.html` / `.artifact.md`)**: skip this step for local reports — nothing to publish. If step 1 found a sidecar, read it for `url`, `title`, and `favicon`, then call the `Artifact` tool with `file_path=<report-path>`, `url=<sidecar url>`, `favicon=<sidecar favicon>`, and a `description` — passing `url` is what stacks the edit onto the **same** claude.ai link instead of minting a new one; a fresh session has no other way to target an existing artifact (this is exactly the gap a missing `url` arg leaves open). After a successful publish, rewrite the sidecar (`node ${CLAUDE_SKILL_DIR}/../../scripts/write-artifact-sidecar.js --report <report-path> --url <url> --title <title> --favicon <favicon>`) so `published_at` reflects this refine.
   - **No sidecar, but the filename still ends in `.artifact.html` or `.artifact.md`**: this file was never successfully published (an earlier attempt fell back to local-only). Publish fresh — omit `url` — and write the sidecar for the first time.
   - **Sidecar present but the republish call errors** (the link died, e.g. the artifact was deleted upstream): publish fresh — omit `url` — write a new sidecar over the old one, and tell the user in one line: "New shared link published — any previously shared link now points to a stale version." Don't guess at *why* the old link died.
9. **Report**: Print the `file://` URL (local reports) or the claude.ai URL (Artifact-channel fragments), summarize what changed

### Feedback harvesting

Every vision-powers HTML report embeds a per-section feedback UI (the ✎ pencil button next to each section). Notes are saved to the browser's `localStorage` under key `vp-feedback-<pathname>` with shape:

```json
{
  "<section-id>": { "text": "<user note>", "status": "issue", "timestamp": "..." }
}
```

When the user invokes `/refine` without specifying what to change (e.g., "refine the last report"), try to harvest their in-browser notes first — they may have already written the feedback.

**Path A: MCP available** — detect by attempting `tabs_context_mcp` first; if it returns without a "tool not found" error, Path A is live and you proceed with the steps below. If the call errors out (tool unavailable, extension disconnected), tell the user the in-browser feedback couldn't be retrieved (e.g. "note: couldn't reach the browser to harvest your ✎ notes — falling back to asking"), then fall through to Path B.

1. `tabs_context_mcp` with `createIfEmpty: true` — get a tab
2. `navigate` to the report's `file://` URL
3. `javascript_tool` with:
   ```js
   JSON.parse(localStorage.getItem('vp-feedback-' + location.pathname) || '{}')
   ```
4. If the returned object has any sections with non-empty `text`, those are the user's feedback items — use them to drive step 3 of refine.
5. If the object is empty `{}`, the user hasn't left any ✎ notes. Ask them what to change.

**Path B: No MCP** — the user can still export their notes manually:

Tell the user: *"Open the report, click Copy in the feedback bar at the bottom of the page, then paste the JSON here."* Parse the pasted JSON (same shape as Path A) and proceed.

**Path C: User wrote feedback directly in the message** — skip harvesting, use the message content.

Harvesting is optional — always fall through to the conventional "ask what to change" flow if no feedback is discoverable. Never block refine on feedback retrieval.

## Gotchas

- **`$CLAUDE_PLUGIN_DATA` is a shell env var**, not a SKILL.md substitution. It only works inside `Bash()` commands. Use `${CLAUDE_SKILL_DIR}` for relative paths to skill/plugin files.
- **Don't call config.js before listing.** `list-reports.js` already checks config internally for custom `reports_dir`. Calling config.js separately wastes a tool call and exits 1 when the key doesn't exist.
- **Don't call log-report.js for listing.** The log file may not exist. `list-reports.js` reads the filesystem directly — no log needed.
- **Report type detection is filename-based**: `*-diff-visual` → diff-visual, `*-doc-visual` → doc-visual, `*-context-health-visual` → context-health-visual, `*-report` → plugin-visual.
- **Refine edits must preserve `style="--i: N"`** on `<li>` and animated elements — these drive staggered CSS animations. Removing them makes items invisible (opacity: 0).
- **A local report and its Artifact-channel fragment are two separate files** (e.g. `2026-07-06-x-doc-visual.html` vs `2026-07-06-x-doc-visual.artifact.html`) with independently designed content — refining one never touches the other. A partial-name match in step 1 of refine can hit both; if the resolved list has more than one candidate, ask which one rather than guessing (issue 007 S4.5).
