---
name: codex-cancel
description: "Cancel an active background Codex job."
disable-model-invocation: true
argument-hint: "[job-id]"
allowed-tools: ["Bash"]
---

# Codex Job Cancel

Pass-through wrapper around the Official Codex companion's `cancel` subcommand. Exists so users who disabled the Official plugin's slash commands can still cancel jobs via codex-advisor.

## Invoke companion cancel

**Arguments:** pass on only a job id (like `task-mf3k2a-x7q1zp`, or a unique start of one) and the flags in `argument-hint`, quoting the job id and any flag value. Drop anything else. If the user asked in words ("stop the running job"), run with no arguments — the companion reads a stray word as a job id and fails with `No job found`.

```bash
set -o pipefail
CODEX_COMPANION=$("${CLAUDE_PLUGIN_ROOT}/scripts/resolve-companion.sh") \
  || { echo "Official Codex plugin not found — run /codex-setup" >&2; exit 1; }

node "$CODEX_COMPANION" cancel <filtered arguments>
```

Relay the companion's output verbatim.

## Gotchas

- **Cancellation is not instant.** The companion signals the Codex worker; in-flight tool calls may complete before the worker exits. Don't promise "stopped immediately".
- **Cancelling a rescue job does NOT revert the diff.** If Codex already wrote files under `--write`, those changes stay on disk. Remind the user to `git diff` / `git restore` if needed.
