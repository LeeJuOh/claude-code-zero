---
name: codex-status
description: "List active and recent Codex jobs plus stored review files."
disable-model-invocation: true
argument-hint: "[job-id] [--wait] [--timeout-ms MS] [--all]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/*)", "Read", "Glob"]
---

# Codex Job Status + Stored Reviews

Thin wrapper around the Official Codex companion's `status` subcommand, combined with a listing of review files saved by codex-advisor. Useful when the user has disabled the Official plugin's slash commands but still wants job visibility.

## Phase 1: Invoke companion status

**Arguments:** pass on only a job id (like `task-mf3k2a-x7q1zp`, or a unique start of one) and the flags in `argument-hint`, quoting the job id and any flag value. If the user asked in words ("what's running?"), run with no arguments. The script refuses anything else, because the companion reads a stray word as a job id and fails with `No job found`.

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-job.sh" status <filtered arguments>
```

Relay the companion's output verbatim. Do NOT reformat — the companion already renders a compact table.

## Phase 2: List stored review files

Codex-advisor writes reports to `${CLAUDE_PLUGIN_DATA}/reviews/`. Add a short section listing the most recent files so the user can correlate jobs with saved reports:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-report.sh" list "${CLAUDE_PLUGIN_DATA}" 10
```

Format:

```markdown
## Recent codex-advisor reports

- review-20260414-102530.md
- rescue-20260414-100112.md
- ...

Location: ${CLAUDE_PLUGIN_DATA}/reviews/
```

If the script prints nothing, skip the section.

## Gotchas

- **Don't reformat the companion's table.** Its markdown is already compact; reformatting risks dropping columns.
- **`--wait` blocks up to `--timeout-ms` (default 240000 = 4 min).** If the user passes `--wait` on a running job, surface a "blocking for up to N seconds" note so they aren't surprised by the pause.
- **Stored reports and companion jobs are *not* 1:1.** A job that failed before codex-advisor's Phase 5 has no report; a review-&lt;ts&gt;-failed.md corresponds to a companion job that completed with an error. Don't assert matching.
