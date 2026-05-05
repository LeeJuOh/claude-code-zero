---
name: codex-status
description: "List active and recent Codex jobs plus stored review files. Use when asked \"codex status\", \"진행중인 코덱스\", or wants to see Codex job state."
argument-hint: "[job-id] [--wait] [--timeout-ms MS] [--all]"
allowed-tools: ["Bash", "Read", "Glob"]
---

# Codex Job Status + Stored Reviews

Thin wrapper around the Official Codex companion's `status` subcommand, combined with a listing of review files saved by codex-advisor. Useful when the user has disabled the Official plugin's slash commands but still wants job visibility.

## Phase 1: Invoke companion status

```bash
set -o pipefail
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh") \
  || { echo "Official Codex plugin not found — run /codex-setup" >&2; exit 1; }

# Forward args verbatim. The companion handles [job-id], --wait,
# --timeout-ms, --all, and prints a markdown table.
node "$CODEX_COMPANION" status $ARGUMENTS
```

Relay the companion's output verbatim. Do NOT reformat — the companion already renders a compact table.

## Phase 2: List stored review files

Codex-advisor writes reports to `${CLAUDE_PLUGIN_DATA}/reviews/`. Add a short section listing the most recent files so the user can correlate jobs with saved reports:

```bash
REVIEWS_DIR="${CLAUDE_PLUGIN_DATA}/reviews"
if [ -d "$REVIEWS_DIR" ]; then
  ls -1t "$REVIEWS_DIR" 2>/dev/null | head -10
fi
```

Format:

```markdown
## Recent codex-advisor reports

- review-20260414-102530.md
- rescue-20260414-100112.md
- ...

Location: ${CLAUDE_PLUGIN_DATA}/reviews/
```

If the directory doesn't exist yet, skip the section (don't create it).

## Gotchas

- **Don't reformat the companion's table.** Its markdown is already compact; reformatting risks dropping columns.
- **`--wait` blocks up to `--timeout-ms` (default 240000 = 4 min).** If the user passes `--wait` on a running job, surface a "blocking for up to N seconds" note so they aren't surprised by the pause.
- **`--all` includes completed jobs across sessions.** Without it, status shows only the current workspace's jobs.
- **Stored reports and companion jobs are *not* 1:1.** A job that failed before codex-advisor's Phase 5 has no report; a review-&lt;ts&gt;-failed.md corresponds to a companion job that completed with an error. Don't assert matching.
