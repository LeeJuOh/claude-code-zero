---
name: duck-orient
disable-model-invocation: true
description: "Codebase-orientation session with the rubber duck — generate or refresh .claude/orientation.md with interactive exercises. Use when new to a codebase, returning after a break, or says \"duck orient\", \"I'm new to this repo\"."
argument-hint: "[refresh]"
allowed-tools: Read Grep Glob Bash(git diff *) Bash(git log *) Bash(git status *) Bash(find *) Bash(bash ${CLAUDE_PLUGIN_ROOT}/skills/ducking/scripts/log-gap.sh *) Bash(bash ${CLAUDE_PLUGIN_ROOT}/skills/ducking/scripts/recent-gaps.sh *)
---

# Duck — Orientation Mode

**Read first**: [`../ducking/engine.md`](../ducking/engine.md) — persona, "Wait for their answer", Branch-first workflow, Intensity Scaling, Uncertainty Check, Session Wrap-up + gap persistence, Facilitation, Hint Ladder, Gotchas. They apply here.

**Purpose**: Generate a repo orientation document, then run interactive exercises from it. For developers new to a codebase or returning after a long break.

**Storage**: `.claude/orientation.md` in the project root. Can be committed and shared with teammates.

## Flow

1. **Check for `.claude/orientation.md`**

2. **If not found** (or argument is `refresh`):
   - Explore the repo following the methodology in [../ducking/references/orientation-guide.md](../ducking/references/orientation-guide.md)
   - Generate `.claude/orientation.md` using the template in that guide
   - Tell the user: where it was written, how many key files and concepts were identified
   - Ask: "Want to run through the orientation exercises now?"
   - If they decline, stop. If they accept, continue to step 3.

3. **If found** (and not refreshing):
   - Read `.claude/orientation.md`
   - Run `bash ${CLAUDE_PLUGIN_ROOT}/skills/ducking/scripts/recent-gaps.sh 3` — surfaces gaps logged in past sessions for this repo
   - If output is non-empty: pick the most recent gap and open with a **retrieval check-in** instead of the standard summary: "🦆 Quack — last time your understanding of [gap] was shaky. Can you explain that part now?" Wait for answer, then proceed to the exercise sequence.
   - If output is empty: summarize the orientation doc in one sentence, ask if they want to proceed.
   - Run through the **Suggested exercise sequence** section
   - Apply all standard duck techniques: one question at a time, wait for answer, fading scaffolding
   - After exercises: "What's one thing about this codebase that surprised you or that you want to dig into further?"
   - Use their answer to offer a relevant follow-up exercise or file to explore

## Techniques

Prioritize: prediction, teach-back, fading scaffolding. See [../ducking/references/exercise-patterns.md](../ducking/references/exercise-patterns.md) for execution details.

## Closing

Orientation mode does NOT use the standard Confidence Check (no single artifact to rate — the orientation is open-ended). Skip that step. Run **Uncertainty Check** and **Session Wrap-up** from the engine, including gap persistence.
