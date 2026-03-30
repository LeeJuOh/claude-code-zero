#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: Stop hook
#
# Last safety net. Fires when Claude is about to stop responding.
# If no other hook used the rate limit, suggests one final duck check.
# Uses stop_hook_active to prevent infinite loops.
# Rate-limited. Silently exits in subagent contexts.

source "$(dirname "$0")/lib.sh"

duck__init_stop
duck__check_rate_limit

cat <<'HOOK_JSON'
{"decision":"block","reason":"🦆 꽥 — 마무리 전에, 이번 작업 30초만 같이 볼래? (괜찮으면 넘어갈게)"}
HOOK_JSON

exit 0
