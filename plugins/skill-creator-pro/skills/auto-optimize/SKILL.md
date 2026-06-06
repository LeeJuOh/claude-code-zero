---
name: auto-optimize
description: "Autonomously optimize any Claude Code skill by running it repeatedly, scoring against binary evals, mutating the prompt, and keeping improvements. Use when: optimize/improve/benchmark/eval a skill, autoresearch, auto-optimize. Not for creating skills from scratch (use skill-creator-pro)."
---

# Autoresearch for Skills

> **Bundled with `skill-creator-pro`.** This skill reads design guidance from its sibling via `${CLAUDE_SKILL_DIR}/../skill-creator-pro/`. The two skills ship together in the `skill-creator-pro` plugin and cannot be installed separately.

Most skills work about 70% of the time. The other 30% you get garbage. The fix isn't to rewrite the skill from scratch. It's to let an agent run it dozens of times, score every output, and tighten the prompt until that 30% disappears.

This skill adapts Andrej Karpathy's autoresearch methodology to Claude Code skills, enhanced with:

- **Reflection-driven mutation** -- reads failed outputs to diagnose WHY they failed, then proposes targeted fixes. The difference between throwing darts blindfolded and throwing them with your eyes open.
- **Per-eval tracking** -- tracks each eval separately so improving one at another's expense gets caught.
- **Structured archive** -- session-surviving changelog that new sessions read to avoid repeating failed experiments.
- **Stuck detection** -- recognizes when incremental mutations hit a wall and escalates strategy.

---

## The Core Job

Take any existing skill, define what "good output" looks like as binary yes/no checks, then run an autonomous loop that:

1. Generates outputs from the skill using test inputs
2. Scores every output against the eval criteria
3. **Reflects on failed outputs** -- reads the actual failures and diagnoses the root cause
4. Mutates the skill prompt to fix the diagnosed issue
5. Keeps mutations that improve the score, discards the rest
6. Repeats until the score ceiling is hit or the user stops it

**Output:** An improved SKILL.md + `results.json` log + structured `changelog.md` + a live HTML dashboard.

---

## Before Starting: Gather Context

**STOP. Do not run any experiments until the fields below are confirmed with the user. Ask for any missing fields before proceeding.**

1. **Target skill** -- Which skill to optimize? (exact path to SKILL.md)
2. **Test inputs** -- 3-5 different prompts/scenarios to test with. Variety matters -- pick inputs that cover different use cases so we don't overfit to one scenario.
3. **Runs per experiment** -- How many times to run the skill per mutation? Default: 5. More runs = more reliable scores but slower. 5 is the sweet spot.
4. **Budget cap** -- Optional. Max number of experiment cycles before stopping. Default: no cap (runs until you stop it).

Do NOT ask the user for eval criteria yet. Evals come from observing real failures, not from guessing upfront.

---

## Step 1: Read the Skill and Learn Design Principles

Before changing anything, read and understand the target skill completely.

1. Read the full SKILL.md file
2. Read any files in `references/` that the skill links to
3. Identify the skill's core job, process steps, and output format
4. Note any existing quality checks or anti-patterns already in the skill
5. Read skill design principles to inform your mutations:
   - `${CLAUDE_SKILL_DIR}/../skill-creator-pro/SKILL.md` -- the "Skill Writing Guide", "Progressive Disclosure", and "Description Optimization" sections cover gotchas, progressive disclosure, and description-as-trigger
   - If available in the project: `docs/reference/skill-lessons-from-anthropic.md` -- Anthropic's practical lessons from building hundreds of skills
   - If the skill uses platform features (hooks, allowed-tools, frontmatter) and something seems wrong, fetch `https://code.claude.com/docs/llms.txt` and the relevant page to verify against the latest spec

Do NOT skip this. You need to understand both the skill AND what makes skills work before you can improve it.

---

## Step 2: Discovery Runs

Run the skill 3-5 times AS-IS using the test inputs. Do NOT score anything yet -- just collect outputs and observe.

1. Create working directory: `autoresearch-[skill-name]/` as sibling to the skill
2. Back up the original SKILL.md as `SKILL.md.baseline`
3. Run the skill with each test input
4. **Save every output in full** -- you'll need these for reflection later. Don't summarize; keep the raw transcript.

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

**Rules for good evals** (the assertion schema lives in `${CLAUDE_SKILL_DIR}/../skill-creator-pro/references/schemas.md`):
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
- Show a colored bar for each experiment: green = keep, red = discard, blue = baseline, yellow = marginal
- Show a table of all experiments: #, score, pass rate, status, description
- Show **per-eval breakdown**: which evals pass most/least across all runs, with trend arrows (up/down/stable)
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
  "consecutive_discards": 0,
  "experiments": [
    {
      "id": 0,
      "score": 14,
      "max_score": 20,
      "pass_rate": 70.0,
      "status": "baseline",
      "description": "original skill -- no changes",
      "reflection": null,
      "per_eval": [
        {"name": "Text legibility", "passed": 4, "total": 5},
        {"name": "Color contrast", "passed": 3, "total": 5}
      ]
    }
  ]
}
```

When the run finishes, update `status` to `"complete"`.

---

## Step 5: Establish Baseline

Now score the discovery run outputs (from Step 2) against the confirmed evals. This is experiment #0.

1. Score every output from discovery runs against every eval
2. Record the baseline score **per-eval** (not just total) and update results.json
3. Update the dashboard

**IMPORTANT:** After establishing baseline, confirm the score with the user before proceeding. If baseline is already 90%+, the skill may not need optimization -- ask if they want to continue.

---

## Step 6: Run the Experiment Loop

This is the core autoresearch loop. Once started, run autonomously until stopped.

**LOOP:**

### 6.1 Reflect on Failures

This is where auto-optimize diverges from blind mutation. Instead of guessing what might help, you read the evidence.

1. **Collect failed outputs.** From the most recent experiment, gather every output that failed at least one eval.

2. **Read the failures.** Actually read the failing outputs -- not just the scores. Look for:
   - Common patterns across failures (same section wrong, same format broken, same step skipped)
   - Partial successes (output was 80% right -- what's the missing 20%?)
   - Regression patterns (something that used to pass now fails)

3. **Diagnose the root cause.** Map each failure pattern back to a specific gap or ambiguity in the SKILL.md. Ask: "What instruction caused this, or what missing instruction allowed this?"

4. **Form a targeted hypothesis.** Not "maybe I should add something about X" but a specific, falsifiable claim:

   Bad: "Adding a color instruction might help"
   Good: "Eval 3 fails because the skill says 'use appropriate colors' -- the model picks neon green 60% of the time. Replacing with a specific hex palette should fix this."

The hypothesis must be specific enough that after running the experiment, you can say whether it was right or wrong. If you can't articulate what you expect to change and why, you're guessing.

For detailed reflection techniques and examples, read `${CLAUDE_SKILL_DIR}/references/reflection-guide.md`.

### 6.2 Mutate

Based on the reflection, make ONE targeted change to SKILL.md.

For mutation strategies, consult the "Skill Writing Guide", "Writing Patterns", and "Writing Style" sections of `${CLAUDE_SKILL_DIR}/../skill-creator-pro/SKILL.md`. Key principle: **one change at a time** so you know what helped.

Bad mutations:
- Rewriting the entire skill from scratch
- Adding 10 new rules at once
- Making the skill longer without a specific reason
- Adding vague instructions like "make it better"
- Adding ALL CAPS directives instead of explaining the reasoning

### 6.3 Run and Score

Execute the skill [N] times with the same test inputs. Score every output against every eval. Record **both total score and per-eval scores**.

### 6.4 Keep or Discard

Before deciding, check two things:

**Per-eval regression check.** Compare each eval's pass count against the current best. If any single eval dropped by 2+ passes while the total score went up, that's the "balloon effect" -- one area improving while another quietly breaks. Flag it in the log and **discard** unless the overall gain clearly outweighs the regression.

**Marginal improvement check.** If the total score improved by less than 5% absolute (e.g., 70% to 73%), mark the experiment as **"marginal"** in the log. Still keep it, but note the uncertainty. If you accumulate 3+ marginal keeps in a row without a clear win, be suspicious -- the score may have drifted up through luck, not real improvement. Consider re-running the current SKILL.md against baseline to verify the cumulative gain is real.

**Decision:**
- Score improved (not marginal) and no eval regressed -> **KEEP.** Log it. This is the new baseline.
- Score improved but marginal -> **KEEP with note.** Log as "marginal". Watch for drift.
- Score improved but an eval regressed badly -> **DISCARD.** The balloon effect isn't real improvement.
- Score stayed the same or got worse -> **DISCARD.** Revert SKILL.md to previous version.

After deciding, update results.json and the structured archive.

### 6.5 Stuck Detection

Track consecutive discards. When the count hits thresholds, escalate:

**3 consecutive discards -- soft reset:**
1. Re-read ALL failing outputs from the last 3 experiments
2. Look for a pattern you missed -- are the failures all the same root cause, or different?
3. Re-read the original SKILL.md baseline to check if you've drifted
4. Try combining elements from two previously successful mutations

**5 consecutive discards -- hard reset:**
1. Everything from above, plus:
2. Re-read the sibling `skill-creator-pro/SKILL.md` design sections -- there may be a structural pattern you haven't tried
3. Try the OPPOSITE of your recent approach (if you've been adding instructions, try removing them)
4. Try a radical structural change (move content to references, add hooks, bundle scripts)
5. If the skill uses platform features, fetch official docs to check for spec misalignment

**8 consecutive discards -- plateau:**
- The skill may have hit its ceiling for this set of evals. Log the plateau, present results to the user, and ask whether to continue with different test inputs, adjusted evals, or stop.

Reset the consecutive discard counter whenever a mutation is kept.

### Loop Control

**NEVER STOP.** Once the loop starts, do not pause to ask the user. They may be away. Run autonomously until:
- The user manually stops you
- You hit the budget cap (if set)
- You hit 95%+ pass rate for 3 consecutive experiments (diminishing returns)
- You hit 8 consecutive discards (plateau -- present results and ask)

**If you run out of ideas:** Re-read the reflection guide. Try a completely different approach. Try removing things instead of adding them. Simplification that maintains the score is a win. Re-read the design principles from Step 1 -- there may be a pattern you haven't tried yet. If the skill uses platform features (hooks, frontmatter, allowed-tools) and failures seem structural, fetch the official docs (`https://code.claude.com/docs/en/skills.md` or `hooks.md`) to check if the skill's usage matches the current spec.

---

## Step 7: Maintain the Structured Archive

The changelog is NOT just a flat log -- it's a structured document that future sessions (or fresh contexts) can read to continue where you left off.

Maintain `autoresearch-[skill-name]/changelog.md` with these sections:

### Current Understanding (update after every kept mutation)

```markdown
## Current Understanding

**What works:**
- Specific hex color codes prevent neon color failures (Exp 3)
- Worked examples are more effective than rules for formatting (Exp 5)

**What doesn't work:**
- Font size instructions alone don't fix legibility -- model ignores px values (Exp 2)
- Vague color descriptions ("pastel", "soft") are unreliable

**Remaining failures:**
- Eval 4 (label formatting) still fails 30% -- labels overlap on dense diagrams
```

### Experiment Log (append after every experiment)

```markdown
## Experiment [N] -- [keep/discard/marginal]

**Score:** [X]/[max] ([percent]%)
**Per-eval:** [Eval1: 5/5] [Eval2: 3/5 DOWN] [Eval3: 4/5]
**Hypothesis:** [What you diagnosed from reflection]
**Change:** [One sentence describing what was changed]
**Result:** [What actually happened -- which evals improved/declined]
**Failing outputs:** [Brief description of what still fails]
```

### Ideas Backlog (add during reflection, prune after trying)

```markdown
## Ideas Backlog

- [ ] Try on-demand hook to block destructive operations
- [ ] Move the API reference table to references/ -- 40 lines of noise in main body
- [x] ~~Add worked example for edge case~~ (tried Exp 5, kept)
- [x] ~~Increase font size instruction~~ (tried Exp 2, didn't work)
```

---

## Step 8: Deliver Results

When the user returns or the loop stops, present:

1. **Score summary:** Baseline score -> Final score (percent improvement)
2. **Total experiments run:** How many mutations were tried
3. **Keep rate:** How many mutations were kept vs discarded
4. **Per-eval progression:** How each eval improved from baseline to final
5. **Top 3 changes that helped most** (from the changelog)
6. **Remaining failure patterns** (what the skill still gets wrong)
7. **The improved SKILL.md** (already saved in place)
8. **Location of dashboard.html and changelog.md** for reference

---

## Output Files

All files in `autoresearch-[skill-name]/`:

```
autoresearch-[skill-name]/
  dashboard.html       # live browser dashboard (auto-refreshes)
  results.json         # data file powering the dashboard
  changelog.md         # structured archive (understanding + log + ideas)
  SKILL.md.baseline    # original skill before optimization
```

Plus the improved SKILL.md saved back to its original location.

---

## Example Run: Optimizing a Diagram Skill

Baseline: 16/20 (80%) -- 4 evals x 5 runs.

| # | Reflection -> Mutation | Score | Result |
|---|---|---|---|
| 1 | "Outputs include '1.' '2.' prefixes -- skill says 'list steps' which implies numbering" -> Added "Do NOT include step numbers in diagram labels" | 18/20 (90%) | **keep** |
| 2 | "Text <10px. Tried px minimum but model ignores pixel values" -> Added "minimum 14px font size" | 17/20 (85%) | **discard** -- Eval 2 regressed, Eval 3 only +1 |
| 3 | "Model picks neon green 60% when skill says 'appropriate colors' -- root cause is ambiguity" -> Replaced with specific hex palette | 19/20 (95%) | **keep** |
| 4 | "Only 1 failure left. Tried anti-pattern for neon" -> Added neon color anti-pattern | 19/20 (95%) | **discard** -- hex codes already solved it, zero gain |
| 5 | "Label text correct but overlaps in small boxes -- need visual example" -> Added worked example for label placement | 20/20 (100%) | **keep** |

**Result:** 80% -> 100% in 5 experiments (3 kept, 2 discarded). Key: reflection found px values don't work (Exp 2) so Exp 3 tried a different approach instead of retrying the same tactic.

---

## The Test

A good autoresearch run:

1. **Started with a baseline** -- never changed anything before measuring
2. **Used binary evals only** -- no scales, no vibes
3. **Reflected on failures** -- read actual outputs, diagnosed root causes, formed specific hypotheses
4. **Changed one thing at a time** -- so you know what helped
5. **Tracked per-eval scores** -- caught regressions in individual evals, not just totals
6. **Maintained a structured archive** -- future sessions can continue without repeating failed experiments
7. **Detected plateaus** -- escalated strategy instead of repeating the same failing approach
8. **Ran autonomously** -- didn't stop to ask permission between experiments

If the skill "passes" all evals but the actual output quality hasn't improved -- the evals are bad, not the skill. Go back to step 2 and write better evals.
