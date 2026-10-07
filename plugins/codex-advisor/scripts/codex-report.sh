#!/usr/bin/env bash
# Stored reports and temp-file cleanup for the codex-advisor skills.
#
#   codex-report.sh save <data-dir> <type> [--failed]
#       Write the report on stdin to <data-dir>/reviews/<type>-<YYYYMMDD-HHMMSS>[-failed].md
#       and print SAVED=<path>. The Write tool asks before every write under
#       ~/.claude/ (a safety check no allow rule lifts), so reports go through
#       this script. Types: review adversarial rescue verify research.
#
#   codex-report.sh list <data-dir> <count>
#       Print the <count> newest file names in <data-dir>/reviews/, newest
#       first. Prints nothing when the folder does not exist yet.
#
#   codex-report.sh clean <data-dir> <run-dir> [--keep-inputs]
#       Delete a run folder made by `codex-task.sh new-run` or `review`.
#       --keep-inputs deletes everything in it except prompt.txt and
#       result.json, which Verifier payloads point at by path (rescue diff:
#       prompt.txt; verify / research doc: both). Refuses any folder outside
#       <data-dir>/tmp/.
set -euo pipefail

die() { echo "$*" >&2; exit 1; }

cmd_list() {
  [ $# -eq 2 ] || die "usage: codex-report.sh list <data-dir> <count>"
  [[ $2 =~ ^[0-9]+$ ]] || die "count must be a number: $2"
  local dir="$1/reviews"
  [ -d "$dir" ] || return 0
  ls -1t "$dir" | head -n "$2"
}

cmd_save() {
  [ $# -ge 2 ] && [ $# -le 3 ] || die "usage: codex-report.sh save <data-dir> <type> [--failed]"
  local data=$1 type=$2 flag=${3:-} suffix=""
  case $type in
    review|adversarial|rescue|verify|research) ;;
    *) die "Unknown report type: $type" ;;
  esac
  case $flag in
    "") ;;
    --failed) suffix=-failed ;;
    *) die "Refused save argument: $flag" ;;
  esac
  [ -t 0 ] && die "No report on stdin — pass it as a here-document"
  local dir="$data/reviews" base path n=1
  mkdir -p "$dir"
  base="$dir/$type-$(date +%Y%m%d-%H%M%S)$suffix"
  path="$base.md"
  while [ -e "$path" ]; do n=$((n + 1)); path="$base-$n.md"; done
  cat > "$path"
  [ -s "$path" ] || { rm -f "$path"; die "Report on stdin was empty"; }
  echo "SAVED=$path"
}

cmd_clean() {
  [ $# -ge 2 ] && [ $# -le 3 ] || die "usage: codex-report.sh clean <data-dir> <run-dir> [--keep-inputs]"
  local data=$1 run=$2 keep=${3:-}
  [ -z "$keep" ] || [ "$keep" = --keep-inputs ] || die "Refused clean argument: $keep"
  [ -d "$run" ] || { echo "Already gone: $run"; return 0; }
  local tmp real
  tmp=$(cd "$data/tmp" 2>/dev/null && pwd -P) || die "No temp folder under $data"
  real=$(cd "$run" && pwd -P)
  case $real in
    "$tmp"/*-run-*) ;;
    *) die "Refused: $run is not a run folder under $data/tmp" ;;
  esac
  if [ -n "$keep" ]; then
    find "$real" -mindepth 1 -maxdepth 1 ! -name prompt.txt ! -name result.json -exec rm -rf {} +
    echo "CLEANED=$real (prompt.txt and result.json kept)"
  else
    rm -rf "$real"
    echo "CLEANED=$real"
  fi
}

case ${1:-} in
  list) shift; cmd_list "$@" ;;
  save) shift; cmd_save "$@" ;;
  clean) shift; cmd_clean "$@" ;;
  *) die "usage: codex-report.sh list <data-dir> <count> | save <data-dir> <type> [--failed] | clean <data-dir> <run-dir> [--keep-inputs]" ;;
esac
