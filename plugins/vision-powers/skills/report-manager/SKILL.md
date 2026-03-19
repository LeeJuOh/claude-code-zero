---
name: report-manager
description: >
  Manage and refine vision-powers reports: list, open, delete, search, and
  refine sections of generated HTML reports. Use when asked to list reports,
  open a previous report, delete old reports, find a specific report, or
  fix/update a section of an existing report — including phrases like
  "리포트 목록", "show my reports", "open the last report", "clean up old
  reports", "find a report about X", "fix section 3", or "리포트 수정".
argument-hint: "<list|open|delete|search> [filter] [--all]"
allowed-tools: Read, Glob, Grep, Edit, AskUserQuestion, Bash(ls *), Bash(rm *), Bash(open *), Bash(node *)
---

# Report Manager

Manage vision-powers HTML reports: list, open in browser, delete, and search by name or content.

Manage and refine vision-powers HTML reports: list, open in browser, delete, search by name or content, and refine specific sections of existing reports.

## Instructions

### Reports Directory

Default path: `${CLAUDE_PLUGIN_DATA}/reports/`

Check if the user has a custom `reports_dir` in config:
```
Bash(node {plugin-root}/scripts/config.js get reports_dir)
```
If set, use that directory instead. If the directory does not exist or is empty, inform the user and stop.

### Report History

Optionally consult the report history log for richer metadata:
```
Bash(node {plugin-root}/scripts/log-report.js --list)
```
This returns JSON entries with `timestamp`, `path`, `type`, and `title` for each report. Use this to enhance the `list` output with original titles and generation timestamps.

### Operation Detection

Determine the operation from `$ARGUMENTS` and user message:

| Intent keywords | Operation |
|----------------|-----------|
| list, show, reports, ls | `list` |
| open, view, browse | `open` |
| delete, remove, clean, prune | `delete` |
| search, find, grep | `search` |
| refine, fix, update, adjust, change section | `refine` |

If ambiguous, default to `list`.

### Operation: list

Display all reports in a table sorted by most recent first.

1. Run `ls -lt ${CLAUDE_PLUGIN_DATA}/reports/*.html` to get files with dates and sizes
2. Infer report type from filename pattern:

| Pattern | Type |
|---------|------|
| `*-diff-visual.html` | diff-visual |
| `*-plan-visual.html` | plan-visual |
| `*-project-recap.html` | project-recap |
| `*-report.html` | agent-extension-visual |
| Other `.html` | unknown |

3. Resolve the absolute path of the reports directory (expand `~` to the actual home directory)
4. Output a numbered table with clickable report links:

```
| # | Report | Type | Size | Date |
|---|--------|------|------|------|
| 1 | [feature-auth-diff-visual.html](file:///path/to/plugin-data/reports/feature-auth-diff-visual.html) | diff-visual | 145KB | 2026-03-03 |
| 2 | [my-project-project-recap.html](file:///path/to/plugin-data/reports/my-project-project-recap.html) | project-recap | 230KB | 2026-03-02 |
```

Build each Report cell as a markdown link: `[filename](file://{absolute-path})`. This lets the user click to open the report directly in their browser.

### Operation: open

Open a report in the default browser.

1. **With argument** (name or number from list): resolve the target file
   - Number: run `list` internally, pick the Nth file
   - Partial name: Glob match against `${CLAUDE_PLUGIN_DATA}/reports/*{arg}*.html`
2. **No argument**: open the most recent report (`ls -t ... | head -1`)
3. Run `open` on the resolved file path (macOS)
4. Print the `file:///` URL for reference

### Operation: delete

Delete one or more reports. **Always confirm with AskUserQuestion before deleting.**

Supported filters:
- **Specific file**: filename or number from list
- **Type filter**: e.g., `--type diff-visual` — delete all reports of that type
- **Age filter**: e.g., `--before 30d` — delete reports older than N days
- **`--all`**: delete every report in the directory

Steps:
1. Resolve which files match the filter
2. Show the list of files that will be deleted (filename, size, date)
3. **Ask for confirmation via AskUserQuestion** — present options: "Delete N files" / "Cancel"
4. On confirmation, run `rm` for each file
5. Report how many files were deleted

### Operation: search

Search reports by filename pattern or content.

1. **Filename search**: Use Glob to match `${CLAUDE_PLUGIN_DATA}/reports/*{query}*.html`
2. **Content search**: Use Grep to search inside HTML files for the query
   - Focus on meaningful content: `<title>`, `<h1>`-`<h3>`, text nodes
   - Show matching filename and the matched context
3. Display results as a numbered list with report type and date, using clickable markdown links: `[filename](file://{absolute-path})`

### Operation: refine

Refine a specific section of an existing report based on feedback, without regenerating the entire report.

*Why: Full report regeneration takes minutes and re-rolls font pairings, colors, and section content. Targeted refinement preserves what works and fixes only what needs changing.*

1. **Resolve the target report**:
   - With argument: filename, number from list, or partial name match
   - No argument: most recent report (`ls -t ${CLAUDE_PLUGIN_DATA}/reports/*.html | head -1`)

2. **Identify the target section**:
   - Parse section number or name from the user's message (e.g., "refine section 3", "fix the Architecture section")
   - If ambiguous, Read the report and list all `<section id="...">` elements with their headings, then use AskUserQuestion to let the user pick

3. **Understand the feedback**:
   - The user describes what to change (e.g., "the Mermaid diagram is wrong", "add more detail about the auth flow", "the numbers don't match")
   - If feedback references source code or git data, use Grep and Read to gather the correct information

4. **Apply refinement**:
   - Read the target section content from the HTML report
   - Use Edit to surgically modify the section based on feedback
   - Preserve HTML structure, CSS classes, `style="--i: N"` values, and Mermaid/Chart.js formatting
   - Do not modify surrounding sections

5. **Validate**:
   - Run the validation script:
     ```
     Bash(node {plugin-root}/scripts/validate-report.js {report-path})
     ```
   - If FAIL, fix issues and re-validate

6. **Report**:
   - Print the `file://` URL for the user to review
   - Summarize what was changed
