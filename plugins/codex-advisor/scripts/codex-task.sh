#!/usr/bin/env bash
# Launch and wait on a background Codex `task` job (rescue / verify / research).
#
#   codex-task.sh launch <prompt-file> <run-dir> [task flags...]
#       Feeds <prompt-file> to `task --background --json` on stdin and prints
#       JOB_ID=<id>. Allowed flags: --write --resume-last --resume --fresh
#       --model <v> --effort <v>. Anything else is refused: a stray positional
#       word makes the companion ignore stdin and run that word as the prompt.
#
#   codex-task.sh wait <job-id> <run-dir>
#       Blocks up to 4 min on `status --wait`, then prints STATUS=<status>.
#       Still active: also prints WAIT_TIMED_OUT=true — call again.
#       Finished (completed / failed / cancelled): writes the result JSON to
#       <run-dir>/result.json and prints RESULT_FILE=<path>; failed or
#       cancelled also prints ERROR=<message>. A run that exits non-zero
#       without throwing leaves no message; ERROR= then says so.
#
# Companion stdout goes to files in <run-dir>, never to this script's stdout:
# `status --json` and `result --json` echo the prompt back, and the prompt can
# hold a document the caller keeps out of its context.
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
WAIT_MS=240000

die() { echo "$*" >&2; exit 1; }

companion() {
  "$SCRIPT_DIR/resolve-companion.sh" || die "Official Codex plugin not found — run /codex-setup"
}

# Print one field of a JSON file; empty when absent. Exit 1 if the file is not JSON.
json_field() {
  node -e '
    const fs = require("fs");
    let o;
    try { o = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); }
    catch (e) { process.stderr.write("not JSON: " + e.message + "\n"); process.exit(1); }
    let v = o;
    for (const k of process.argv[2].split(".")) v = v == null ? undefined : v[k];
    process.stdout.write(v == null ? "" : String(v));
  ' "$1" "$2"
}

cmd_launch() {
  [ $# -ge 2 ] || die "usage: codex-task.sh launch <prompt-file> <run-dir> [task flags...]"
  local prompt=$1 dir=$2
  shift 2
  [ -s "$prompt" ] || die "Prompt file missing or empty: $prompt"

  local flags=()
  while [ $# -gt 0 ]; do
    case $1 in
      --write|--resume-last|--resume|--fresh) flags+=("$1") ;;
      --model|--effort)
        [ $# -ge 2 ] && [ -n "$2" ] || die "Missing value for $1"
        flags+=("$1" "$2"); shift ;;
      *) die "Refused task argument: $1 (allowed: --write --resume-last --resume --fresh --model <v> --effort <v>)" ;;
    esac
    shift
  done

  local c
  c=$(companion)
  mkdir -p "$dir"
  node "$c" task --background --json ${flags[@]+"${flags[@]}"} \
    < "$prompt" > "$dir/job.json" 2> "$dir/job.stderr" \
    || { echo "task launch failed:" >&2; cat "$dir/job.stderr" >&2; exit 1; }

  local id
  id=$(json_field "$dir/job.json" jobId) \
    || { echo "raw companion stdout:" >&2; cat "$dir/job.json" >&2; exit 1; }
  [ -n "$id" ] || { echo "no jobId in companion stdout:" >&2; cat "$dir/job.json" >&2; exit 1; }
  echo "JOB_ID=$id"
}

cmd_wait() {
  [ $# -eq 2 ] || die "usage: codex-task.sh wait <job-id> <run-dir>"
  local id=$1 dir=$2 c status
  c=$(companion)
  mkdir -p "$dir"
  node "$c" status --wait "$id" --timeout-ms "$WAIT_MS" --json \
    > "$dir/status.json" 2> "$dir/status.stderr" \
    || { echo "status failed:" >&2; cat "$dir/status.stderr" >&2; exit 1; }

  status=$(json_field "$dir/status.json" job.status)
  echo "STATUS=$status"
  case $status in
    queued|running) echo "WAIT_TIMED_OUT=true"; return 0 ;;
  esac

  node "$c" result "$id" --json > "$dir/result.json" 2> "$dir/result.stderr" \
    || { echo "result failed:" >&2; cat "$dir/result.stderr" >&2; exit 1; }
  echo "RESULT_FILE=$dir/result.json"
  if [ "$status" != completed ]; then
    local msg
    msg=$(json_field "$dir/status.json" job.errorMessage)
    echo "ERROR=${msg:-no message from the companion (Codex exited non-zero); the user can read the run with /codex-result $id}"
  fi
}

case ${1:-} in
  launch) shift; cmd_launch "$@" ;;
  wait) shift; cmd_wait "$@" ;;
  *) die "usage: codex-task.sh launch <prompt-file> <run-dir> [task flags...] | wait <job-id> <run-dir>" ;;
esac
