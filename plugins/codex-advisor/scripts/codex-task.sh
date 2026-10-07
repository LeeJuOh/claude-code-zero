#!/usr/bin/env bash
# Run Codex for the codex-advisor skills. Every shell step a skill takes goes
# through a script in this folder, so one allowed-tools rule
# (Bash(${CLAUDE_PLUGIN_ROOT}/scripts/*)) covers the whole run without a prompt.
# Plugin variables are absent from the Bash tool's environment, so the skill
# passes the data folder as an argument.
#
#   codex-task.sh new-run <data-dir> <kind>
#       Make a fresh run folder <data-dir>/tmp/<kind>-run-XXXXXX and print
#       RUN_DIR=<path> and PROMPT_FILE=<path>/prompt.txt. Refuses first when the
#       Official Codex plugin is missing, so the user is not asked to approve a
#       prompt that cannot run.
#
#   codex-task.sh check-doc <path>
#       Refuse a missing or empty file, else print DOC_LINES=<n>. Never prints content.
#
#   codex-task.sh check-ref <ref>
#       Refuse a ref git cannot resolve, listing up to 20 branches on stderr.
#
#   codex-task.sh prompt <prompt-file> [--document <path> --tag <tag>]
#       Write stdin (the prompt header) to <prompt-file>, which must be the
#       PROMPT_FILE that new-run printed. With --document, append
#       the file wrapped in <tag>...</tag> by redirect, so its text never reaches
#       stdout. Call again to rewrite the prompt.
#
#   codex-task.sh snapshot
#       Print PRE_TREE=<sha>: the whole working tree as a git tree object.
#
#   codex-task.sh review <data-dir> <review|adversarial-review> [--base <ref>]
#                        [--scope <auto|working-tree|branch>] [--model <m>] [--focus <text>]
#       Start the review detached from this call and print RUN_DIR=, OUT_FILE=
#       and ERR_FILE= at once. Follow with review-wait. --focus is
#       adversarial-review only.
#
#   codex-task.sh review-wait <run-dir>
#       Blocks up to 4 min for the review to exit, then prints STATUS=running|done.
#       Done: also prints COMPANION_EXIT=<code> and OUTPUT=json|empty|non-json.
#       Running: call again.
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
#   codex-task.sh payload <data-dir> <prepare-verifier.py args...>
#       Run prepare-verifier.py with a fresh --out-dir under <data-dir>/tmp and,
#       outside --mode doc, --repo set to the git top level. `--ref auto` becomes
#       `--ref HEAD` when the review's target.mode is branch, and is dropped
#       otherwise. Prints WORK=<out-dir>, then the script's JSON; exits with its code.
#
# Companion stdout goes to files in <run-dir>, never to this script's stdout:
# `status --json` and `result --json` echo the prompt back, and the prompt can
# hold a document the caller keeps out of its context.
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
WAIT_MS=240000
WAIT_S=240

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

# Die unless <data-dir> is this plugin's data folder (an absolute path, no ..).
# The scripts run without a permission prompt, so they write only there.
check_data_dir() {
  case $1 in
    /*/plugins/data/codex-advisor-*) ;;
    *) die "Refused data folder: $1 (expected .../plugins/data/codex-advisor-<marketplace>)" ;;
  esac
  case /$1/ in */../*|*/./*) die "Refused data folder: $1" ;; esac
}

# Print the real path of an existing run folder, or die. The scripts run
# without a permission prompt, so every write target must be a run folder
# that new-run, review or payload made under this plugin's data folder.
real_run_dir() {
  local real
  real=$(cd "$1" 2>/dev/null && pwd -P) || die "No run folder: $1"
  case ${real%/*} in
    */plugins/data/codex-advisor-*/tmp) ;;
    *) die "Refused: $1 is not under the codex-advisor data folder's tmp/" ;;
  esac
  case ${real##*/} in
    *-run-*) ;;
    *) die "Refused: $1 is not a run folder" ;;
  esac
  echo "$real"
}

# Print the real path of <run-dir>/prompt.txt, or die.
real_prompt_file() {
  [ "$(basename "$1")" = prompt.txt ] || die "Refused prompt file name: $1 (must be prompt.txt)"
  local dir
  dir=$(real_run_dir "$(dirname "$1")") || exit 1
  echo "$dir/prompt.txt"
}

make_run_dir() {
  local data=$1 kind=$2
  check_data_dir "$data"
  case $kind in
    review|adversarial|rescue|verify|research) ;;
    *) die "Unknown run kind: $kind" ;;
  esac
  mkdir -p "$data/tmp"
  mktemp -d "$data/tmp/$kind-run-XXXXXX"
}

cmd_new_run() {
  [ $# -eq 2 ] || die "usage: codex-task.sh new-run <data-dir> <kind>"
  companion > /dev/null
  local dir
  dir=$(make_run_dir "$1" "$2")
  echo "RUN_DIR=$dir"
  echo "PROMPT_FILE=$dir/prompt.txt"
}

cmd_check_doc() {
  [ $# -eq 1 ] || die "usage: codex-task.sh check-doc <path>"
  [ -f "$1" ] || die "File not found: $1"
  [ -s "$1" ] || die "File is empty: $1"
  echo "DOC_LINES=$(wc -l < "$1" | tr -d ' ')"
}

cmd_check_ref() {
  [ $# -eq 1 ] || die "usage: codex-task.sh check-ref <ref>"
  git rev-parse --verify --quiet "$1^{commit}" > /dev/null && return 0
  echo "Unknown revision: $1" >&2
  git branch --list 2>/dev/null | head -20 >&2 || true
  exit 1
}

cmd_prompt() {
  [ $# -ge 1 ] || die "usage: codex-task.sh prompt <prompt-file> [--document <path> --tag <tag>]"
  local file doc="" tag=""
  file=$(real_prompt_file "$1") || exit 1
  shift
  while [ $# -gt 0 ]; do
    case $1 in
      --document) [ $# -ge 2 ] || die "Missing value for --document"; doc=$2; shift ;;
      --tag) [ $# -ge 2 ] || die "Missing value for --tag"; tag=$2; shift ;;
      *) die "Refused prompt argument: $1 (allowed: --document <path> --tag <tag>)" ;;
    esac
    shift
  done
  if [ -n "$doc" ]; then
    [[ $tag =~ ^[a-z_]+$ ]] || die "--document needs --tag <name> (lowercase letters and _)"
    [ -s "$doc" ] || die "Document missing or empty: $doc"
  fi
  [ -t 0 ] && die "No prompt on stdin — pass the header as a here-document"
  cat > "$file"
  [ -s "$file" ] || die "Prompt header on stdin was empty"
  if [ -n "$doc" ]; then
    { printf '\n<%s>\n' "$tag"; cat "$doc"; printf '\n</%s>\n' "$tag"; } >> "$file"
  fi
  echo "PROMPT_WRITTEN=$file"
}

cmd_snapshot() {
  [ $# -eq 0 ] || die "usage: codex-task.sh snapshot"
  local repo tree
  repo=$(git rev-parse --show-toplevel) || die "Not inside a git repository"
  tree=$("$SCRIPT_DIR/prepare-verifier.py" snapshot --repo "$repo")
  echo "PRE_TREE=$tree"
}

cmd_review() {
  [ $# -ge 2 ] || die "usage: codex-task.sh review <data-dir> <review|adversarial-review> [flags...]"
  local data=$1 sub=$2 kind focus=""
  shift 2
  case $sub in
    review) kind=review ;;
    adversarial-review) kind=adversarial ;;
    *) die "Unknown review command: $sub" ;;
  esac

  local flags=()
  while [ $# -gt 0 ]; do
    case $1 in
      --base|--model)
        [ $# -ge 2 ] && [ -n "$2" ] || die "Missing value for $1"
        flags+=("$1" "$2"); shift ;;
      --scope)
        case ${2:-} in auto|working-tree|branch) ;; *) die "--scope must be auto, working-tree or branch" ;; esac
        flags+=("$1" "$2"); shift ;;
      --focus)
        [ "$sub" = adversarial-review ] || die "review rejects focus text — use adversarial-review"
        [ $# -ge 2 ] && [ -n "$2" ] || die "Missing value for --focus"
        focus=$2; shift ;;
      *) die "Refused review argument: $1 (allowed: --base <ref> --scope <s> --model <m> --focus <text>)" ;;
    esac
    shift
  done

  local c dir out err
  c=$(companion)
  dir=$(make_run_dir "$data" "$kind")
  out="$dir/$kind.json"
  err="$dir/$kind.log"
  echo "RUN_DIR=$dir"
  echo "OUT_FILE=$out"
  echo "ERR_FILE=$err"

  local args=("$sub" --json ${flags[@]+"${flags[@]}"})
  [ -n "$focus" ] && args+=("$focus")
  # A review runs in the foreground on the companion side and can outlast one
  # Bash call. Detaching it (its own session, like the companion's task worker)
  # lets this call return, so the skill waits with review-wait inside the same
  # turn and keeps its allowed-tools grant. The exit code lands in <run-dir>/exit.
  # `set -m` gives the companion its own process group: /codex-cancel signals
  # the group of the pid the companion recorded, and finds none otherwise.
  node -e '
    const { spawn } = require("child_process");
    const [dir, out, err, ...cmd] = process.argv.slice(1);
    spawn("/bin/sh", ["-c", "set -m; \"$0\" \"$@\" > \"$OUT\" 2> \"$ERR\" & wait $!; echo $? > \"$DIR/exit.tmp\"; mv \"$DIR/exit.tmp\" \"$DIR/exit\"", ...cmd],
      { detached: true, stdio: "ignore", env: { ...process.env, OUT: out, ERR: err, DIR: dir } }).unref();
  ' "$dir" "$out" "$err" "$(command -v node)" "$c" "${args[@]}"
}

cmd_review_wait() {
  [ $# -eq 1 ] || die "usage: codex-task.sh review-wait <run-dir>"
  local dir kind out i=0
  dir=$(real_run_dir "$1") || exit 1
  case $(basename "$dir") in
    review-run-*) kind=review ;;
    adversarial-run-*) kind=adversarial ;;
    *) die "Not a review run folder: $dir" ;;
  esac
  while [ ! -f "$dir/exit" ] && [ "$i" -lt "$WAIT_S" ]; do
    sleep 1; i=$((i + 1))
  done
  if [ ! -f "$dir/exit" ]; then
    echo "STATUS=running"
    return 0
  fi
  out="$dir/$kind.json"
  echo "STATUS=done"
  echo "COMPANION_EXIT=$(cat "$dir/exit")"
  if [ ! -s "$out" ]; then
    echo "OUTPUT=empty"
  elif json_field "$out" "" > /dev/null 2>&1; then
    echo "OUTPUT=json"
  else
    echo "OUTPUT=non-json"
  fi
}

cmd_payload() {
  [ $# -ge 1 ] || die "usage: codex-task.sh payload <data-dir> <prepare-verifier.py args...>"
  local data=$1
  shift
  local args=() input="" mode=findings ref=""
  while [ $# -gt 0 ]; do
    case $1 in
      --out-dir|--repo) die "payload sets $1 itself" ;;
      --ref) [ $# -ge 2 ] || die "Missing value for --ref"; ref=$2; shift ;;
      --input) [ $# -ge 2 ] || die "Missing value for --input"; input=$2; args+=("$1" "$2"); shift ;;
      --mode) [ $# -ge 2 ] || die "Missing value for --mode"; mode=$2; args+=("$1" "$2"); shift ;;
      *) args+=("$1") ;;
    esac
    shift
  done

  if [ "$mode" != doc ]; then
    local repo
    repo=$(git rev-parse --show-toplevel) || die "Not inside a git repository"
    args+=(--repo "$repo")
  fi
  if [ "$ref" = auto ]; then
    [ -n "$input" ] || die "--ref auto needs --input"
    # A branch review judged committed code, so its citations should still match
    # HEAD; a working-tree review has no such ref. target.mode is the scope the
    # companion actually resolved, the only reliable answer under --scope auto.
    [ "$(json_field "$input" target.mode 2>/dev/null || true)" = branch ] && args+=(--ref HEAD)
  elif [ -n "$ref" ]; then
    args+=(--ref "$ref")
  fi

  check_data_dir "$data"
  mkdir -p "$data/tmp"
  local work out rc=0
  work=$(mktemp -d "$data/tmp/verify-XXXXXX")
  out=$("$SCRIPT_DIR/prepare-verifier.py" "${args[@]}" --out-dir "$work") || rc=$?
  if [ "$rc" -ne 0 ]; then
    rmdir "$work" 2>/dev/null || true
    exit "$rc"
  fi
  echo "WORK=$work"
  printf '%s\n' "$out"
}

cmd_launch() {
  [ $# -ge 2 ] || die "usage: codex-task.sh launch <prompt-file> <run-dir> [task flags...]"
  local prompt dir
  prompt=$(real_prompt_file "$1") || exit 1
  dir=$(real_run_dir "$2") || exit 1
  [ "$prompt" = "$dir/prompt.txt" ] || die "Refused: prompt file is not in run folder $2"
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
  local id=$1 dir c status
  dir=$(real_run_dir "$2") || exit 1
  c=$(companion)
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
  new-run) shift; cmd_new_run "$@" ;;
  check-doc) shift; cmd_check_doc "$@" ;;
  check-ref) shift; cmd_check_ref "$@" ;;
  prompt) shift; cmd_prompt "$@" ;;
  snapshot) shift; cmd_snapshot "$@" ;;
  review) shift; cmd_review "$@" ;;
  review-wait) shift; cmd_review_wait "$@" ;;
  launch) shift; cmd_launch "$@" ;;
  wait) shift; cmd_wait "$@" ;;
  payload) shift; cmd_payload "$@" ;;
  *) die "usage: codex-task.sh new-run|check-doc|check-ref|prompt|snapshot|review|review-wait|launch|wait|payload ... (see the header)" ;;
esac
