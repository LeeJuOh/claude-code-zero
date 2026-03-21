---
name: autoresearch
description: "Autonomously optimize any Claude Code skill by running it repeatedly, scoring outputs against binary evals, mutating the prompt, and keeping improvements. Based on Karpathy's autoresearch methodology. Use when: optimize this skill, improve this skill, run autoresearch on, make this skill better, self-improve skill, benchmark skill, eval my skill, run evals on, autoresearch. Do NOT use for: creating skills from scratch (use skill-creator-pro), description/trigger optimization (use skill-creator-pro Phase 5), or one-off manual improvements."
---

# Autoresearch for Skills

Most skills work about 70% of the time. The other 30% you get garbage. The fix isn't to rewrite the skill from scratch. It's to let an agent run it dozens of times, score every output, and tighten the prompt until that 30% disappears.

This skill adapts Andrej Karpathy's autoresearch methodology (autonomous experimentation loops) to Claude Code skills. Instead of optimizing ML training code, we optimize skill prompts.

---

## The Core Job

Take any existing skill, define what "good output" looks like as binary yes/no checks, then run an autonomous loop that:

1. Generates outputs from the skill using test inputs
2. Scores every output against the eval criteria
3. Mutates the skill prompt to fix failures
4. Keeps mutations that improve the score, discards the rest
5. Repeats until the score ceiling is hit or the user stops it

**Output:** An improved SKILL.md + `results.json` log + `changelog.md` of every mutation attempted + a live HTML dashboard.

---

## Before Starting: Gather Context

**STOP. Do not run any experiments until the fields below are confirmed with the user. Ask for any missing fields before proceeding.**

1. **Target skill** -- Which skill to optimize? (exact path to SKILL.md)
2. **Test inputs** -- 3-5 different prompts/scenarios to test with. Variety matters -- pick inputs that cover different use cases so we don't overfit to one scenario.
3. **Runs per experiment** -- How many times to run the skill per mutation? Default: 5. More runs = more reliable scores but slower. 5 is the sweet spot.
4. **Budget cap** -- Optional. Max number of experiment cycles before stopping. Default: no cap (runs until you stop it).

Do NOT ask the user for eval criteria yet. Evals come from observing real failures, not from guessing upfront.

---

## Step 1: Read the Skill

Before changing anything, read and understand the target skill completely.

1. Read the full SKILL.md file
2. Read any files in `references/` that the skill links to
3. Identify the skill's core job, process steps, and output format
4. Note any existing quality checks or anti-patterns already in the skill

Do NOT skip this. You need to understand what the skill does before you can improve it.

---

## Step 2: Discovery Runs

Run the skill 3-5 times AS-IS using the test inputs. Do NOT score anything yet -- just collect outputs and observe.

1. Create working directory: `autoresearch-[skill-name]/` as sibling to the skill
2. Back up the original SKILL.md as `SKILL.md.baseline`
3. Run the skill with each test input
4. Save every output for review

**While reviewing outputs, identify failure patterns:**
- What goes wrong consistently?
- What works well that we should protect?
- Are there formatting issues, missing steps, wrong defaults?
- What would a user complain about?

The highest-signal content comes from real failure points, not theoretical checklists.

---

## Step 3: Propose Evals

Based on the failure patterns you observed in discovery runs, **propose 3-6 binary eval criteria** to the user.

**Format each eval as:**

```
EVAL [number]: [Short name]
Question: [Yes/no question about the output]
Pass condition: [What "yes" looks like -- be specific]
Fail condition: [What triggers a "no"]
```

Present the proposed evals and explain which observed failures each one targets. The user confirms, adjusts, or adds their own.

**Rules for good evals** (see [eval writing guide](${CLAUDE_SKILL_DIR}/../skill-creator-pro/references/eval-writing-guide.md) for details):
- Binary only. Yes or no. No scales.
- Specific enough that two different agents would agree on the verdict.
- Not so narrow the skill can game the eval without actually improving.
- 3-6 evals is the sweet spot.

**Max score calculation:**

```
max_score = [number of evals] x [runs per experiment]
```

**IMPORTANT:** Do not proceed to the experiment loop until the user confirms the eval criteria.

---

## Step 4: Set Up Dashboard

Before running experiments, create a live HTML dashboard at `autoresearch-[skill-name]/dashboard.html` and open it.

The dashboard must:
- Auto-refresh every 10 seconds (reads from results.json)
- Show a score progression line chart (experiment # on X, pass rate % on Y)
- Show a colored bar for each experiment: green = keep, red = discard, blue = baseline
- Show a table of all experiments: #, score, pass rate, status, description
- Show per-eval breakdown: which evals pass most/least across all runs
- Show current status: "Running experiment [N]..." or "Idle"

Generate as a single self-contained HTML file with inline CSS and JavaScript. Use Chart.js from CDN for the chart. The JS should fetch `results.json` and re-render.

**Open it immediately** after creating it: `open dashboard.html`

**Update `results.json`** after every experiment so the dashboard stays current:

```json
{
  "skill_name": "[name]",
  "status": "running",
  "current_experiment": 3,
  "baseline_score": 70.0,
  "best_score": 90.0,
  "experiments": [
    {
      "id": 0,
      "score": 14,
      "max_score": 20,
      "pass_rate": 70.0,
      "status": "baseline",
      "description": "original skill -- no changes"
    }
  ],
  "eval_breakdown": [
    {"name": "Text legibility", "pass_count": 8, "total": 10}
  ]
}
```

When the run finishes, update `status` to `"complete"`.

---

## Step 5: Establish Baseline

Now score the discovery run outputs (from Step 2) against the confirmed evals. This is experiment #0.

1. Score every output from discovery runs against every eval
2. Record the baseline score and update results.json
3. Update the dashboard

**IMPORTANT:** After establishing baseline, confirm the score with the user before proceeding. If baseline is already 90%+, the skill may not need optimization -- ask if they want to continue.

---

## Step 6: Run the Experiment Loop

This is the core autoresearch loop. Once started, run autonomously until stopped.

**LOOP:**

1. **Analyze failures.** Look at which evals fail most. Read the actual outputs that failed. Identify the pattern -- formatting issue? Missing instruction? Ambiguous directive?

2. **Form a hypothesis.** Pick ONE thing to change. Don't change 5 things at once -- you won't know what helped.

   Good mutations:
   - Add a specific instruction that addresses the most common failure
   - Reword an ambiguous instruction to be more explicit
   - Add an anti-pattern ("Do NOT do X") for a recurring mistake
   - Move a buried instruction higher in the skill (priority = position)
   - Add or improve an example showing correct behavior
   - Remove an instruction causing over-optimization for one thing at the expense of others

   Bad mutations:
   - Rewriting the entire skill from scratch
   - Adding 10 new rules at once
   - Making the skill longer without a specific reason
   - Adding vague instructions like "make it better"

3. **Make the change.** Edit SKILL.md with ONE targeted mutation.

4. **Run the experiment.** Execute the skill [N] times with the same test inputs.

5. **Score it.** Run every output through every eval. Calculate total score.

6. **Decide: keep or discard.**
   - Score improved -> **KEEP.** Log it. This is the new baseline.
   - Score stayed the same -> **DISCARD.** Revert SKILL.md to previous version. Added complexity without improvement.
   - Score got worse -> **DISCARD.** Revert SKILL.md to previous version.

7. **Log the result** in results.json and changelog.md.

8. **Repeat.** Go back to step 1 of the loop.

**NEVER STOP.** Once the loop starts, do not pause to ask the user. They may be away. Run autonomously until:
- The user manually stops you
- You hit the budget cap (if set)
- You hit 95%+ pass rate for 3 consecutive experiments (diminishing returns)

**If you run out of ideas:** Re-read failing outputs. Try combining two previous near-miss mutations. Try a completely different approach. Try removing things instead of adding them. Simplification that maintains the score is a win.

---

## Step 7: Write the Changelog

After each experiment (kept or discarded), append to `changelog.md`:

```markdown
## Experiment [N] -- [keep/discard]

**Score:** [X]/[max] ([percent]%)
**Change:** [One sentence describing what was changed]
**Reasoning:** [Why this change was expected to help]
**Result:** [What actually happened -- which evals improved/declined]
**Failing outputs:** [Brief description of what still fails, if anything]
```

This changelog is the most valuable artifact. It's a research log that any future agent can pick up and continue from.

---

## Step 8: Deliver Results

When the user returns or the loop stops, present:

1. **Score summary:** Baseline score -> Final score (percent improvement)
2. **Total experiments run:** How many mutations were tried
3. **Keep rate:** How many mutations were kept vs discarded
4. **Top 3 changes that helped most** (from the changelog)
5. **Remaining failure patterns** (what the skill still gets wrong)
6. **The improved SKILL.md** (already saved in place)
7. **Location of dashboard.html and changelog.md** for reference

---

## Output Files

All files in `autoresearch-[skill-name]/`:

```
autoresearch-[skill-name]/
  dashboard.html       # live browser dashboard (auto-refreshes)
  results.json         # data file powering the dashboard
  changelog.md         # detailed mutation log
  SKILL.md.baseline    # original skill before optimization
```

Plus the improved SKILL.md saved back to its original location.

---

## The Test

A good autoresearch run:

1. **Started with a baseline** -- never changed anything before measuring
2. **Used binary evals only** -- no scales, no vibes
3. **Changed one thing at a time** -- so you know what helped
4. **Kept a complete log** -- every experiment recorded
5. **Improved the score** -- measurable improvement from baseline to final
6. **Didn't overfit** -- the skill got better at the actual job, not just at passing specific test inputs
7. **Ran autonomously** -- didn't stop to ask permission between experiments

If the skill "passes" all evals but the actual output quality hasn't improved -- the evals are bad, not the skill. Go back to step 2 and write better evals.
