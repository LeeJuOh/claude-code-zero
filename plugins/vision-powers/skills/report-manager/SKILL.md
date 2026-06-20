---
name: report-manager
description: >
  Manage and refine vision-powers reports: list, open, delete, search, and refine sections.
  Use when asked to list, open, delete, search, or update generated HTML reports.
argument-hint: "<list|open|delete|search|refine> [filter] [--all]"
allowed-tools: Read, Glob, Grep, Edit, AskUserQuestion, Bash(ls *), Bash(rm *), Bash(open *), Bash(node *)
---

# Report Manager

Manage vision-powers HTML reports: list, open, delete, search, and refine sections.

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

Output contains `reports_dir`, `count`, and `reports[]` (each with `index`, `filename`, `path`, `type`, `size`, `date`).

Format as a numbered table with clickable links:

```
| # | Report | Type | Size | Date |
|---|--------|------|------|------|
| 1 | [filename](file:///absolute/path) | type | size | date |
```

## open

1. **No argument**: open the most recent report
2. **Number**: Nth from list output
3. **Partial name**: glob match `$CLAUDE_PLUGIN_DATA/reports/*{arg}*.html`

```bash
open <resolved-absolute-path>
```

Print the `file:///` URL for reference.

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
4. `rm` each file on confirmation
5. Report count deleted

## search

1. **Filename**: Glob `$CLAUDE_PLUGIN_DATA/reports/*{query}*.html`
2. **Content**: Grep inside HTML for the query — focus on `<title>`, `<h1>`–`<h3>`, text nodes
3. Display results with clickable `file://` links

## refine

Surgically edit a section of an existing report without full regeneration.

*Why: Full regeneration re-rolls fonts, colors, and all content. Targeted edits preserve what works.*

1. **Resolve target report**: filename, number, partial name, or most recent if none given
2. **Harvest in-browser feedback (optional, see "Feedback harvesting" below)**: if the user has been leaving notes via the ✎ UI, read them before asking for more
3. **Identify section**: If feedback (from step 2 or user message) names specific sections, use those. Otherwise parse from message; if still ambiguous, Read the report, list `<section id="...">` headings, and use AskUserQuestion to let the user pick
4. **Gather context**: If feedback references source code or git data, use Grep/Read to get correct info
5. **Apply edit**: Read the target section, use Edit to modify it. Preserve HTML structure, CSS classes, `style="--i: N"` values, and Mermaid/Chart.js formatting. Do not touch other sections.
   - When you re-author the section's *content* (not just patch a value), don't reintroduce behavioral slop. Read `${CLAUDE_SKILL_DIR}/../../references/design-system/anti-slop-tells.md` for the catalogue of named defaults to break — summary-leak, linear dump, forced diagram, generic label, uniform density, empty decoration, accent overuse. They're reflexes to resist, not a layout to apply: taste and structure stay yours.
6. **Validate**:
   ```
   node ${CLAUDE_SKILL_DIR}/../../scripts/artifact-gate.js <report-path>
   ```
   If violations found, fix inline and re-validate (max 2 retries).
7. **Visual self-audit (HTML only)**: The gate reads the HTML as *text* — it never sees the rendered picture, so a re-authored section can pass the gate and still render as a tangled diagram, a clipped label, or a flat grey wall. After the gate passes, render the report and look at it:
   ```
   node ${CLAUDE_SKILL_DIR}/../../scripts/render-report.js <report-path>
   ```
   On success it prints a PNG path. **Read that PNG** (you read images multimodally) and scan it for what the text gate can't judge:
   - **Density** — is the edited section a uniform grey wall, or a diagram past its budget and unreadable?
   - **Hierarchy** — does anything draw the eye first, or is every section the same weight?
   - **Mermaid integrity** — did a diagram render as raw `<pre>` text or as crossing/overlapping edges?
   - **Overflow** — does a diagram, table, or label run past its container or off the page?

   Fix what you see and re-render — **cap at 2 audit passes**, then ship with a one-line note rather than looping. **If Chrome is absent**, `render-report.js` exits non-zero; skip the audit and tell the user it was skipped (e.g. "rendered-image check skipped: Chrome not found — set `CHROME_BIN` or install Chrome"). The visual pass is an enhancement and **never blocks** delivery. Full procedure: `${CLAUDE_SKILL_DIR}/../../references/design-system/visual-self-audit.md`.
8. **Report**: Print `file://` URL, summarize what changed

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
