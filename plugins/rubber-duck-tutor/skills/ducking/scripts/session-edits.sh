#!/usr/bin/env bash
# duck: list files touched by Edit/Write/MultiEdit/NotebookEdit in the
# current session's transcript (S8 -- session-scoping duck-verify beyond
# what `git diff` alone can see, e.g. edits already committed mid-session).
#
# Usage: session-edits.sh [transcript-path]
#
# Reads $DUCK_TRANSCRIPT_PATH (planted by hooks/session-start.sh) when no
# argument is given. Prints one absolute file path per line, deduplicated.
#
# Prints nothing and exits 0 when the transcript is missing, jq is
# unavailable, or a line fails to parse -- the caller (duck-verify) treats
# empty output as "fall back to git diff", never as an error. Transcript
# JSONL is not a stable contract (it's Claude Code internals, not a
# documented API), so this must degrade quietly on format drift rather
# than crash a verify session over it.

set -uo pipefail

TRANSCRIPT="${1:-${DUCK_TRANSCRIPT_PATH:-}}"

[[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]] || exit 0
command -v jq &>/dev/null || exit 0

# -R + fromjson? reads each line as raw text and parses it independently,
# so one malformed line is skipped rather than aborting the whole file --
# unlike piping the file straight into `jq` in JSON mode.
jq -R -r '
  fromjson? |
  select(.type == "assistant") |
  .message.content[]? |
  select(.type == "tool_use") |
  select(.name == "Edit" or .name == "Write" or .name == "MultiEdit" or .name == "NotebookEdit") |
  (.input.file_path // .input.notebook_path // empty)
' "$TRANSCRIPT" 2>/dev/null | sort -u

exit 0
