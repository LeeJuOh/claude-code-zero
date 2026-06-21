---
name: codex-result
description: "Show the final stored result of a completed Codex job. Use when asked \"codex result\", \"show the codex output\", \"show me the job result\", or wants output from a finished job."
argument-hint: "[job-id]"
allowed-tools: ["Bash", "Read", "Glob"]
---

# Codex Job Result + Stored Review Linking

Thin wrapper around the Official Codex companion's `result` subcommand. If a codex-advisor review file exists for the same timestamp window, also surface its path so the user can read the classified findings (Agreed / Disputed / Nuanced / False Positive / Uncited).

## Phase 1: Fetch companion result

```bash
set -o pipefail
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh") \
  || { echo "Official Codex plugin not found — run /codex-setup" >&2; exit 1; }

# Forward args verbatim. The companion accepts an optional [job-id];
# without one it shows the most recent finished job.
node "$CODEX_COMPANION" result $ARGUMENTS
```

Relay the companion's rendered result verbatim (includes the Codex session ID, making `codex resume <session-id>` possible).

## Phase 2: Find the matching codex-advisor report

Codex-advisor stores reports at `${CLAUDE_PLUGIN_DATA}/reviews/<type>-<YYYYMMDD-HHMMSS>.md`. These are separate from companion jobs — a given job may or may not have a matching report depending on which skill launched it.

```bash
REVIEWS_DIR="${CLAUDE_PLUGIN_DATA}/reviews"
if [ -d "$REVIEWS_DIR" ]; then
  # List the 3 most recent reports; the user can pick the one whose
  # timestamp aligns with the job.
  ls -1t "$REVIEWS_DIR" 2>/dev/null | head -3
fi
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
- **No `job-id` → most recent.** The companion picks the most recently *completed* job in the current workspace; this may not be what the user wants if they just finished multiple jobs. Prompt for clarification if ambiguous.
- **Session ID enables `codex resume`.** If the companion's output includes a `session_id`, point that out — the user can continue that Codex thread with `codex resume <session-id>` outside Claude entirely.
