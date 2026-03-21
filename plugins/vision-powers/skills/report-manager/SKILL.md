---
name: report-manager
description: >
  Manage and refine vision-powers reports: list, open, delete, search, and
  refine sections of generated HTML reports. Use when asked to list reports,
  open a previous report, delete old reports, find a specific report, or
  fix/update a section of an existing report — including phrases like
  "show my reports", "open the last report", "clean up old
  reports", "find a report about X", "fix section 3", or "update report".
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
2. **Identify section**: Parse section number/name from user message. If ambiguous, Read the report, list `<section id="...">` headings, and use AskUserQuestion to let the user pick
3. **Gather context**: If feedback references source code or git data, use Grep/Read to get correct info
4. **Apply edit**: Read the target section, use Edit to modify it. Preserve HTML structure, CSS classes, `style="--i: N"` values, and Mermaid/Chart.js formatting. Do not touch other sections
5. **Validate**:
   ```
   node ${CLAUDE_SKILL_DIR}/../../scripts/validate-report.js <report-path>
   ```
   If FAIL, fix issues and re-validate.
6. **Report**: Print `file://` URL, summarize what changed

## Gotchas

- **`$CLAUDE_PLUGIN_DATA` is a shell env var**, not a SKILL.md substitution. It only works inside `Bash()` commands. Use `${CLAUDE_SKILL_DIR}` for relative paths to skill/plugin files.
- **Don't call config.js before listing.** `list-reports.js` already checks config internally for custom `reports_dir`. Calling config.js separately wastes a tool call and exits 1 when the key doesn't exist.
- **Don't call log-report.js for listing.** The log file may not exist. `list-reports.js` reads the filesystem directly — no log needed.
- **Report type detection is filename-based**: `*-diff-visual` → diff-visual, `*-plan-visual` → plan-visual, `*-project-recap` → project-recap, `*-report` → agent-extension-visual.
- **Refine edits must preserve `style="--i: N"`** on `<li>` and animated elements — these drive staggered CSS animations. Removing them makes items invisible (opacity: 0).
