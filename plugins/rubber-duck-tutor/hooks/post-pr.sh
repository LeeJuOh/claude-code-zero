#!/usr/bin/env bash
set -uo pipefail

# rubber-duck-tutor-auto: PostToolUse hook (matches Bash with gh pr / glab mr create filter)
#
# Fires after Bash tool use filtered by `if: Bash(gh pr create*)` / `if: Bash(glab mr create*)`.
# Inline regex defends against compound commands.
# Shares the "ship" rate-limit bucket (max 1/session) with post-push.sh — whichever
# of {git push, gh pr create, glab mr create} fires first wins for the session
# (ADR 0003 shared ship budget). Silently exits in subagent contexts.
#
# S10: the moment a confrontation actually fires (rate limit passed), this
# script appends a "fire" telemetry event directly -- deterministic, no model
# involvement. The model records the matching "outcome" event later, once it
# can see whether the user engaged (see additionalContext below).
#
# S12: 3+ consecutive ignores (computed deterministically in shell from
# telemetry, no model/transcript involvement) demotes this confrontation from
# a question to a non-blocking scoreboard statement -- still fires, still
# non-blocking (ADR 0003), just stops asking once asking has stopped working.

source "$(dirname "$0")/lib.sh"

duck__init

duck__is_enabled || exit 0

# Detect PR/MR creation commands
COMMAND=$(duck__get '.tool_input.command')
if ! echo "$COMMAND" | grep -qE '(gh\s+pr\s+create|glab\s+mr\s+create)'; then
  exit 0
fi

duck__check_rate_limit "ship" 1

STREAK=0
if [[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
  STREAK=$(bash "${CLAUDE_PLUGIN_ROOT}/skills/ducking/scripts/ignore-streak.sh" 2>/dev/null)
fi
[[ "$STREAK" =~ ^[0-9]+$ ]] || STREAK=0

MODE="question"
if [[ "$STREAK" -ge 3 ]]; then
  MODE="scoreboard"
fi

if [[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
  bash "${CLAUDE_PLUGIN_ROOT}/skills/ducking/scripts/log-telemetry.sh" fire pr "$MODE" 2>/dev/null || true
fi

if [[ "$MODE" == "scoreboard" ]]; then
  cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] A PR/MR was just created. This is scoreboard mode, not question mode: the user has ignored the last 3 ship-point confrontations in a row (telemetry-tracked, deterministic -- you don't need to check it yourself), so another question right now would be nagging, not learning. Don't ask anything. Instead: (1) list the distinct artifacts (files/modules) this PR/MR touches; (2) judge each against the same six risk categories duck always uses -- concurrency, security, performance, data schema, public API, architecture boundary (see the plugin engine doc's Risk Taxonomy section for the full definitions if you need them); (3) for every artifact landing in a risk category, judge engagement from this conversation alone -- did the user actually discuss, question, or direct that specific piece themselves? (4) deliver one factual scoreboard line, no question mark: name every high-risk artifact from this PR/MR and how many of them the user engaged with, e.g. \"Scoreboard: 3 high-risk changes this PR -- auth middleware, payment retry logic, session schema -- you engaged with 1 of them.\" Always name the artifacts; never collapse this into a bare percentage or vague count. If nothing here is high-risk, say so plainly (\"No high-risk changes this PR/MR\") instead of forcing a tally. End your message right there -- this is a statement, not a prompt, so there's nothing to wait for. Stay in duck character but don't soften it into a question. Then watch how the user responds on their own: if they engage with the scoreboard unprompted (push back, comment, ask about one of the named changes), log it as answered -- this breaks the ignore streak, so the next ship confrontation goes back to asking a real question; if they move on without engaging, log it as ignored, silently, without mentioning it to them: `bash ${CLAUDE_PLUGIN_ROOT}/skills/ducking/scripts/log-telemetry.sh outcome pr answered` or `... outcome pr ignored`."}}
HOOK_JSON
else
  cat <<'HOOK_JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[rubber-duck-tutor-auto] A PR/MR was just created. Before you ask anything, triage what shipped instead of defaulting to a generic question about the whole change: (1) list the distinct artifacts (files/modules) this PR/MR touches; (2) judge each against six risk categories -- always a judgement call, never a strict rule -- concurrency (locking, shared state, async ordering), security (auth, secrets, input validation), performance (hot paths, added I/O, complexity), data schema (migrations, persisted/serialized shape), public API (anything another package, plugin, or external caller depends on), and architecture boundary (a seam moved, a new cross-module dependency direction); (3) for any artifact landing in a risk category, judge engagement from this conversation alone -- did the user actually discuss, question, or direct that specific piece themselves? Silence, agreement, or you writing it unprompted does not count; (4) if exactly one high-risk, low-engagement artifact stands out, name it and ask about an interface fact -- an invariant, an error mode, an ordering constraint, or a trade-off it makes -- never code quality or style (that's /code-review's job, not duck's); (5) if several tie, pick whichever would be worst to get wrong in production; if nothing is high-risk, or every high-risk artifact was already engaged with, fall back to one short artifact-level question about the overall change, same as before. Confront the user with exactly one such question and end your message right after it. Do not suggest running another command; this is an inline confrontation, not a session. Stay in duck character; it's non-blocking, so ask once and move on regardless of their answer. Exception: if this PR/MR covers a large or many-artifact change where one inline question can't do it justice, suggest `/branch` then `/duck-review` instead so a fuller review can happen without interrupting their flow. If another plugin has already suggested a review, skip silently. Once you see how the user responds -- a substantive answer, or them moving on to something else without addressing it -- log the outcome once, silently, without mentioning it to them: `bash ${CLAUDE_PLUGIN_ROOT}/skills/ducking/scripts/log-telemetry.sh outcome pr answered` or `... outcome pr ignored`."}}
HOOK_JSON
fi

exit 0
