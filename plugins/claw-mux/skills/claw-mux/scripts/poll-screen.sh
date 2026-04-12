#!/usr/bin/env bash
# Poll cmux read-screen until a grep -E pattern matches or timeout.
# Usage: poll-screen.sh <surface> <pattern> [--timeout 60] [--interval 3] [--lines 15]
# Exit 0 on match (prints matched output), exit 1 on timeout (prints last output).
set -euo pipefail

surface="$1"
pattern="$2"
shift 2

timeout=60
interval=3
lines=15

while [[ $# -gt 0 ]]; do
  case "$1" in
    --timeout)  timeout="$2";  shift 2 ;;
    --interval) interval="$2"; shift 2 ;;
    --lines)    lines="$2";    shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

elapsed=0
while [ "$elapsed" -lt "$timeout" ]; do
  output=$(cmux read-screen --surface "$surface" --scrollback --lines "$lines" 2>/dev/null) || true
  if echo "$output" | grep -qE "$pattern"; then
    echo "$output"
    exit 0
  fi
  sleep "$interval"
  elapsed=$((elapsed + interval))
done

echo "POLL_TIMEOUT after ${timeout}s — last output:"
cmux read-screen --surface "$surface" --scrollback --lines "$lines" 2>/dev/null || true
exit 1
