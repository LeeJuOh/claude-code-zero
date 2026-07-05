#!/usr/bin/env bash
# rubber-duck-tutor: SessionStart hook -- plants DUCK_TRANSCRIPT_PATH so
# skill-invoked Bash calls (duck-verify's session-edits.sh, S8) can locate
# the session transcript. Hooks are the only channel that receives
# transcript_path (stdin JSON); a user-invoked skill's Bash calls cannot
# derive it on their own -- same constraint documented in
# docs/adr/0006-codex-advisor-conditional-transcript-hook.md for
# codex-advisor's identical pattern (borrowed here, not reinvented).
#
# Not gated on duck__is_enabled: this only plants a path, it never
# confronts the user, and gating it would leave duck-verify permanently
# stuck if the user flips `enabled` back on mid-session.

set -uo pipefail

source "$(dirname "$0")/lib.sh"

duck__init

[[ -n "${CLAUDE_ENV_FILE:-}" ]] || exit 0
grep -q 'DUCK_TRANSCRIPT_PATH' "$CLAUDE_ENV_FILE" 2>/dev/null && exit 0

TRANSCRIPT_PATH=$(duck__get '.transcript_path')
[[ -n "$TRANSCRIPT_PATH" ]] || exit 0

printf 'export DUCK_TRANSCRIPT_PATH=%q\n' "$TRANSCRIPT_PATH" >> "$CLAUDE_ENV_FILE"
exit 0
