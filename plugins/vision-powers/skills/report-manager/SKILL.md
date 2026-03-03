---
name: report-manager
description: >
  Manage vision-powers reports: list, open, delete, and search generated
  HTML reports. Use when asked to list reports, open a previous report,
  delete old reports, or find a specific report. Not for generating or
  modifying report content.
argument-hint: "<list|open|delete|search> [filter] [--all]"
allowed-tools: Read, Glob, Grep, AskUserQuestion, Bash(ls *), Bash(rm *), Bash(open *)
---

# Report Manager

Manage vision-powers HTML reports: list, open in browser, delete, and search by name or content.

This skill does NOT generate or modify reports. It is a file management utility for the reports directory.

## Instructions

### Reports Directory

Fixed path: `~/.claude-code-zero/vision-powers/reports/`

If the directory does not exist or is empty, inform the user and stop.

### Operation Detection

Determine the operation from `$ARGUMENTS` and user message:

| Intent keywords | Operation |
|----------------|-----------|
| list, show, reports, ls | `list` |
| open, view, browse | `open` |
| delete, remove, clean, prune | `delete` |
| search, find, grep | `search` |

If ambiguous, default to `list`.

### Operation: list

Display all reports in a table sorted by most recent first.

1. Run `ls -lt ~/.claude-code-zero/vision-powers/reports/*.html` to get files with dates and sizes
2. Infer report type from filename pattern:

| Pattern | Type |
|---------|------|
| `*-diff-visual.html` | diff-visual |
| `*-plan-visual.html` | plan-visual |
| `*-project-recap.html` | project-recap |
| `*-report.html` | agent-extension-visual |
| Other `.html` | unknown |

3. Output a numbered table:

```
| # | Report | Type | Size | Date |
|---|--------|------|------|------|
| 1 | feature-auth-diff-visual.html | diff-visual | 145KB | 2026-03-03 |
| 2 | my-project-project-recap.html | project-recap | 230KB | 2026-03-02 |
```

### Operation: open

Open a report in the default browser.

1. **With argument** (name or number from list): resolve the target file
   - Number: run `list` internally, pick the Nth file
   - Partial name: Glob match against `~/.claude-code-zero/vision-powers/reports/*{arg}*.html`
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

1. **Filename search**: Use Glob to match `~/.claude-code-zero/vision-powers/reports/*{query}*.html`
2. **Content search**: Use Grep to search inside HTML files for the query
   - Focus on meaningful content: `<title>`, `<h1>`-`<h3>`, text nodes
   - Show matching filename and the matched context
3. Display results as a numbered list with report type and date
