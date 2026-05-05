---
name: duck-orient
description: "Codebase-orientation session with the rubber duck — generate or refresh .claude/orientation.md with interactive exercises. Use when new to a codebase, returning after a break, or says \"duck orient\", \"이 레포 처음이야\"."
argument-hint: "[refresh]"
allowed-tools: Read Grep Glob Bash(git diff *) Bash(git log *) Bash(git status *) Bash(find *) Bash(bash ${CLAUDE_PLUGIN_ROOT}/skills/duck/scripts/log-gap.sh *) Bash(bash ${CLAUDE_PLUGIN_ROOT}/skills/duck/scripts/recent-gaps.sh *)
---

# Duck — Orientation Mode

**Read first**: [../duck/references/core.md](../duck/references/core.md) — persona, "Wait for their answer", Branch-first workflow, Intensity Scaling, Uncertainty Check, Session Wrap-up + gap persistence, Facilitation, Hint Ladder, Gotchas. They apply here.

**Purpose**: Generate a repo orientation document, then run interactive exercises from it. For developers new to a codebase or returning after a long break.

**Storage**: `.claude/orientation.md` in the project root. Can be committed and shared with teammates.

## Flow

1. **Check for `.claude/orientation.md`**

2. **If not found** (or argument is `refresh`):
   - Explore the repo following the methodology in [../duck/references/orientation-guide.md](../duck/references/orientation-guide.md)
   - Generate `.claude/orientation.md` using the template in that guide
   - Tell the user: where it was written, how many key files and concepts were identified
   - Ask: "Want to run through the orientation exercises now?"
   - If they decline, stop. If they accept, continue to step 3.

3. **If found** (and not refreshing):
   - Read `.claude/orientation.md`
   - Run `bash ${CLAUDE_PLUGIN_ROOT}/skills/duck/scripts/recent-gaps.sh 3` — surfaces gaps logged in past sessions for this repo
   - If output is non-empty: pick the most recent gap and open with a **retrieval check-in** instead of the standard summary: "🦆 꽥 — 지난번에 [gap]에 대한 이해가 약했어. 그 부분 지금 다시 설명할 수 있어?" Wait for answer, then proceed to the exercise sequence.
   - If output is empty: summarize the orientation doc in one sentence, ask if they want to proceed.
   - Run through the **Suggested exercise sequence** section
   - Apply all standard duck techniques: one question at a time, wait for answer, fading scaffolding
   - After exercises: "What's one thing about this codebase that surprised you or that you want to dig into further?"
   - Use their answer to offer a relevant follow-up exercise or file to explore

## Techniques

Prioritize: prediction, teach-back, fading scaffolding. See [../duck/references/exercise-patterns.md](../duck/references/exercise-patterns.md) for execution details.

## Closing

Orientation mode does NOT use the standard Confidence Check (no single artifact to rate — the orientation is open-ended). Skip that step. Run **Uncertainty Check** and **Session Wrap-up** from [../duck/references/core.md](../duck/references/core.md), including gap persistence.
