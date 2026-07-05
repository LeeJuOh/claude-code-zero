---
name: duck
description: "Rubber duck tutor — auto-detects which review mode to run. Use when the user says \"duck\", \"tutor\", \"quiz me\", \"do I understand this\", or mentions rubber-stamping or learning while coding. For a specific phase use /duck-prebuild, /duck-verify, /duck-review, or /duck-orient."
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash(git diff *) Bash(git log *) Bash(git status *) Bash(bash ${CLAUDE_PLUGIN_ROOT}/skills/ducking/scripts/log-gap.sh *) Bash(bash ${CLAUDE_PLUGIN_ROOT}/skills/ducking/scripts/read-config.sh *)
---

# Duck (auto-detect)

Auto-detects which mode fits the user's current state and routes to the matching mode skill. Read [`../ducking/engine.md`](../ducking/engine.md) for shared persona, principles, and session-management rules — they apply to every mode.

## Mode Map

| Trigger phrase / state | Mode skill |
|------|------|
| "build this for me" / stated implementation intent, no plan or code yet | `/duck-prebuild` |
| Active plan in conversation (or `.claude/orientation.md`-adjacent design doc) | `/duck-prebuild` |
| Files recently created/modified in this session | `/duck-verify` |
| Uncommitted changes (`git diff --stat` non-empty) | `/duck-review` |
| User new to the repo, returning after long break, "where should I even start" | `/duck-orient` |
| None of the above | Ask the user which phase they want |

## Detection Order

Check in this order — first match wins:

1. **Pre-coding intent** — user just stated they want to build X but no plan/diff/code exists yet → `/duck-prebuild`
2. **Plan in context** — a plan or design doc was produced in this session → `/duck-prebuild`
3. **Uncommitted changes** — `git diff --stat` shows a real diff → `/duck-review`
4. **Recent in-session edits** — files were created or modified earlier in this session but not yet committed → `/duck-verify`
5. **Orientation gap** — user appears unfamiliar with the repo → `/duck-orient`
6. **Ambiguous** — ask the user which phase they want before continuing

## Behavior When the User Picks Their Own Mode

If the user named a mode (`prebuild`, `verify`, `review`, `orient` — or the older `design`/`plan` words, both alias to `prebuild`), suggest the matching `/duck-<mode>` command and stop — don't run the mode flow inline. The dedicated mode skill carries the full instructions for that flow.

If the user passed `$ARGUMENTS` and it matches a known mode word, hand off to `/duck-<mode>` (map `design`/`plan` → `prebuild`; otherwise use `$ARGUMENTS` as-is):

> "🦆 Quack — you want `/duck-<mode>`. Call it directly instead."

Otherwise apply the detection order above.

## Sticking to Auto Mode

If the user wants to keep going inside `/duck` instead of switching to the mode-specific command, run the matching mode's flow inline. The mode-specific SKILL.md files contain the canonical flows — read the file and follow it.

## Shared Rules

All persona, opening line, "Wait for their answer", Confidence Check, Intensity Scaling, Uncertainty Check, Session Wrap-up + gap persistence, Branch-first workflow + fallback, Session Limits, Facilitation, and Gotchas live in [`../ducking/engine.md`](../ducking/engine.md). Read it before running any flow.
