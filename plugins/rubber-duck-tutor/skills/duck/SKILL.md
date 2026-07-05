---
name: duck
description: "Rubber duck tutor — auto-detects which review mode to run. Use when the user says \"duck\", \"tutor\", \"quiz me\", \"do I understand this\", or mentions rubber-stamping or learning while coding. For a specific phase use /duck-design, /duck-plan, /duck-verify, /duck-review, or /duck-orient."
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash(git diff *) Bash(git log *) Bash(git status *) Bash(bash ${CLAUDE_PLUGIN_ROOT}/skills/ducking/scripts/log-gap.sh *)
---

# Duck (auto-detect)

Auto-detects which mode fits the user's current state and routes to the matching mode skill. Read [`../ducking/engine.md`](../ducking/engine.md) for shared persona, principles, and session-management rules — they apply to every mode.

## Mode Map

| Trigger phrase / state | Mode skill |
|------|------|
| "구현해줘" / stated implementation intent, no plan or code yet | `/duck-design` |
| Active plan in conversation (or `.claude/orientation.md`-adjacent design doc) | `/duck-plan` |
| Files recently created/modified in this session | `/duck-verify` |
| Uncommitted changes (`git diff --stat` non-empty) | `/duck-review` |
| User new to the repo, returning after long break, "어디부터 봐야돼" | `/duck-orient` |
| None of the above | Ask the user which phase they want |

## Detection Order

Check in this order — first match wins:

1. **Pre-coding intent** — user just stated they want to build X but no plan/diff/code exists yet → `/duck-design`
2. **Plan in context** — a plan or design doc was produced in this session → `/duck-plan`
3. **Uncommitted changes** — `git diff --stat` shows a real diff → `/duck-review`
4. **Recent in-session edits** — files were created or modified earlier in this session but not yet committed → `/duck-verify`
5. **Orientation gap** — user appears unfamiliar with the repo → `/duck-orient`
6. **Ambiguous** — ask the user which phase they want before continuing

## Behavior When the User Picks Their Own Mode

If the user named a mode (`design`, `plan`, `verify`, `review`, `orient`), suggest the matching `/duck-<mode>` command and stop — don't run the mode flow inline. The dedicated mode skill carries the full instructions for that flow.

If the user passed `$ARGUMENTS` and it matches a known mode word, hand off:

> "🦆 꽥 — `/duck-$ARGUMENTS`로 가는 게 맞아. 그쪽으로 호출해줘."

Otherwise apply the detection order above.

## Sticking to Auto Mode

If the user wants to keep going inside `/duck` instead of switching to the mode-specific command, run the matching mode's flow inline. The mode-specific SKILL.md files contain the canonical flows — read the file and follow it.

## Shared Rules

All persona, opening line, "Wait for their answer", Confidence Check, Intensity Scaling, Uncertainty Check, Session Wrap-up + gap persistence, Branch-first workflow + fallback, Session Limits, Facilitation, and Gotchas live in [`../ducking/engine.md`](../ducking/engine.md). Read it before running any flow.
