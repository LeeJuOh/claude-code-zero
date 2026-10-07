---
name: codex-result
description: "Show the final stored result of a completed Codex job."
disable-model-invocation: true
argument-hint: "[job-id]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/*)", "Read", "Glob"]
---

# Codex Job Result + Stored Review Linking

Thin wrapper around the Official Codex companion's `result` subcommand. If a codex-advisor review file exists for the same timestamp window, also surface its path so the user can read the classified findings (Agreed / Disputed / Nuanced / False Positive / Uncited).

## Phase 1: Fetch companion result

**Arguments:** pass on only a job id (like `task-mf3k2a-x7q1zp`, or a unique start of one), quoted. If the user asked in words ("show me the last job"), run with no arguments. The script refuses anything else, because the companion reads a stray word as a job id and fails with `No job found`.

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-job.sh" result <filtered arguments>
```

Relay the companion's rendered result verbatim (includes the Codex session ID, making `codex resume <session-id>` possible).

## Phase 2: Find the matching codex-advisor report

Codex-advisor stores reports at `${CLAUDE_PLUGIN_DATA}/reviews/<type>-<YYYYMMDD-HHMMSS>.md`. These are separate from companion jobs — a given job may or may not have a matching report depending on which skill launched it.

List the 3 most recent reports; the user can pick the one whose timestamp aligns with the job. Skip the section when the script prints nothing.

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/codex-report.sh" list "${CLAUDE_PLUGIN_DATA}" 3
```

Append:

```markdown
## Related codex-advisor reports (most recent)

- review-20260414-102530.md
- rescue-20260414-100112.md
- ...

If the timestamp matches the job you fetched, open that file for Claude's double-check classification. Path: ${CLAUDE_PLUGIN_DATA}/reviews/
```

Don't claim a specific report belongs to the queried job unless timestamps clearly align — the user decides.

## Gotchas

- **The companion's result is authoritative for Codex output.** codex-advisor's report adds classification on top but the raw Codex text lives in the companion's store.
- **Session ID enables `codex resume`.** If the companion's output includes a `session_id`, point that out — the user can continue that Codex thread with `codex resume <session-id>` outside Claude entirely.
