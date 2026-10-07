#!/usr/bin/env bash
# Thin wrappers around the Official Codex companion for the slash-only skills.
# Each one checks its arguments here, so a stray word never reaches the
# companion — `status`, `result` and `cancel` read one as a job id and fail
# with `No job found`.
#
#   codex-job.sh status [job-id] [--wait] [--timeout-ms <ms>] [--all]
#   codex-job.sh result [job-id]
#   codex-job.sh cancel [job-id]
#       Run that companion subcommand and pass its output through.
#
#   codex-job.sh transfer [--source <path>] [--show-json]
#       Run `transfer --json` (blocks up to the companion's 2-minute import
#       cap) and print THREAD_ID= and RESUME_COMMAND=. --show-json also prints
#       the raw payload.
#
#   codex-job.sh setup
#       Run `setup --json`: what is installed and signed in.
#
#   codex-job.sh config
#       Print ${CODEX_HOME:-~/.codex}/config.toml, or NO_CONFIG.
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
JOB_ID_RE='^[A-Za-z0-9][A-Za-z0-9._-]*$'

die() { echo "$*" >&2; exit 1; }

companion() {
  "$SCRIPT_DIR/resolve-companion.sh" || die "Official Codex plugin not found — run /codex-setup"
}

# Allow at most one job id plus the given boolean/value flags.
check_job_args() {
  local bools=$1 values=$2
  shift 2
  local seen_id=""
  while [ $# -gt 0 ]; do
    [ -n "$1" ] || die "Refused an empty argument"
    case " $bools " in *" $1 "*) shift; continue ;; esac
    case " $values " in
      *" $1 "*)
        [[ ${2:-} =~ ^[0-9]+$ ]] || die "$1 needs a number"
        shift 2; continue ;;
    esac
    [[ $1 =~ $JOB_ID_RE ]] && [ -z "$seen_id" ] || die "Refused argument: $1 (allowed: one job id${bools:+ plus $bools}${values:+ $values})"
    seen_id=$1
    shift
  done
}

cmd_passthrough() {
  local sub=$1 bools=$2 values=$3
  shift 3
  check_job_args "$bools" "$values" "$@"
  local c
  c=$(companion)
  exec node "$c" "$sub" "$@"
}

cmd_transfer() {
  local args=() show=""
  while [ $# -gt 0 ]; do
    case $1 in
      --source) [ $# -ge 2 ] && [ -n "$2" ] || die "Missing value for --source"; args+=(--source "$2"); shift ;;
      --show-json) show=1 ;;
      *) die "Refused transfer argument: $1 (allowed: --source <path> --show-json)" ;;
    esac
    shift
  done
  local c out
  c=$(companion)
  out=$(mktemp)
  node "$c" transfer --json ${args[@]+"${args[@]}"} > "$out" 2> "$out.stderr" \
    || { echo "transfer failed:" >&2; cat "$out.stderr" >&2; exit 1; }
  node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log("THREAD_ID="+j.threadId);console.log("RESUME_COMMAND="+j.resumeCommand);' "$out"
  [ -z "$show" ] || cat "$out"
  rm -f "$out" "$out.stderr"
}

cmd_setup() {
  [ $# -eq 0 ] || die "usage: codex-job.sh setup"
  local c
  c=$(companion)
  exec node "$c" setup --json
}

cmd_config() {
  [ $# -eq 0 ] || die "usage: codex-job.sh config"
  cat "${CODEX_HOME:-$HOME/.codex}/config.toml" 2>/dev/null || echo "NO_CONFIG"
}

case ${1:-} in
  status) shift; cmd_passthrough status "--wait --all" "--timeout-ms" "$@" ;;
  result) shift; cmd_passthrough result "" "" "$@" ;;
  cancel) shift; cmd_passthrough cancel "" "" "$@" ;;
  transfer) shift; cmd_transfer "$@" ;;
  setup) shift; cmd_setup "$@" ;;
  config) shift; cmd_config "$@" ;;
  *) die "usage: codex-job.sh status|result|cancel|transfer|setup|config ... (see the header)" ;;
esac
