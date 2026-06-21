---
name: codex-cancel
description: "Cancel an active background Codex job. Use when asked \"codex cancel\", \"stop codex\", \"abort the codex job\", or wants to stop a running Codex task."
argument-hint: "[job-id]"
allowed-tools: ["Bash", "AskUserQuestion"]
---

# Codex Job Cancel

Pass-through wrapper around the Official Codex companion's `cancel` subcommand. Exists so users who disabled the Official plugin's slash commands can still cancel jobs via codex-advisor.

## Phase 1: Confirm target (if ambiguous)

If the user did not provide a `job-id`, the companion cancels the most recent active job — which may not be what they intended. Use `AskUserQuestion` when:

- Multiple active jobs exist (check via `node "$CODEX_COMPANION" status` first, optional).
- The user's phrasing suggests a specific job ("cancel the rescue", "stop the research") but no ID.

Skip the prompt when the intent is obvious (single active job, or they pass an explicit ID).

## Phase 2: Invoke companion cancel

```bash
set -o pipefail
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh") \
  || { echo "Official Codex plugin not found — run /codex-setup" >&2; exit 1; }

node "$CODEX_COMPANION" cancel $ARGUMENTS
```

Relay the companion's output verbatim. It typically reports `cancelled` or `no-op (not running)`.

## Gotchas

- **Cancellation is not instant.** The companion signals the Codex worker; in-flight tool calls may complete before the worker exits. Don't promise "stopped immediately".
- **Cancelling a rescue job does NOT revert the diff.** If Codex already wrote files under `--write`, those changes stay on disk. Remind the user to `git diff` / `git restore` if needed.
- **No job-id == most recent active.** Only one job at a time is the common case, so this usually does what the user wants — but with multiple active jobs it can surprise. When in doubt, run `status` first and cancel by explicit ID.
