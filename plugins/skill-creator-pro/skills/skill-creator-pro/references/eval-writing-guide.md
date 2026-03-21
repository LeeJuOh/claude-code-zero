# Eval Writing Guide

How to write eval criteria that produce reliable, actionable scores instead of false confidence.

---

## The Golden Rule

Every eval must be a yes/no question. Not a scale. Not a vibe check. Binary.

**Why:** Scales compound variability. If you have 4 evals scored 1-7, your total score has massive variance across runs. Binary evals give you a reliable signal. Two different grading agents scoring the same output should agree.

---

## Good Evals vs Bad Evals

### Text/Copy Skills (newsletters, tweets, emails, landing pages)

**Bad:**
- "Is the writing good?" (too vague)
- "Rate the engagement potential 1-10" (scale = unreliable)
- "Does it sound like a human?" (subjective, inconsistent scoring)

**Good:**
- "Does the output contain zero phrases from this banned list: [game-changer, here's the kicker, the best part, level up]?"
- "Does the opening sentence reference a specific time, place, or sensory detail?"
- "Is the output between 150-400 words?"
- "Does it end with a specific CTA that tells the reader exactly what to do next?"

### Visual/Design Skills (diagrams, images, slides)

**Bad:**
- "Does it look professional?" (subjective)
- "Rate the visual quality 1-5" (scale)

**Good:**
- "Is all text legible with no truncated or overlapping words?"
- "Does the color palette use only soft/pastel tones with no neon or high-saturation colors?"
- "Is the layout linear -- flowing left-to-right or top-to-bottom with no scattered elements?"

### Code/Technical Skills (code generation, configs, scripts)

**Bad:**
- "Is the code clean?" (subjective)
- "Does it follow best practices?" (vague -- which best practices?)

**Good:**
- "Does the code run without errors?" (actually execute it)
- "Does the output contain zero TODO or placeholder comments?"
- "Are all function/variable names descriptive (no single-letter names except loop counters)?"
- "Does the code include error handling for all external calls (API, file I/O, network)?"

### Document Skills (proposals, reports, decks)

**Bad:**
- "Is it comprehensive?" (compared to what?)
- "Does it address the client's needs?" (too open-ended)

**Good:**
- "Does the document contain all required sections: [list them]?"
- "Is every claim backed by a specific number, date, or source?"
- "Does the executive summary fit in one paragraph of 3 sentences or fewer?"

---

## The 3-Question Test

Before finalizing an eval, ask:

1. **Could two different agents score the same output and agree?** If not, the eval is too subjective. Rewrite it.
2. **Could a skill game this eval without actually improving?** If yes, the eval is too narrow. Broaden it.
3. **Does this eval test something the user actually cares about?** If not, drop it. Every eval that doesn't matter dilutes the signal from evals that do.

---

## Common Mistakes

### 1. Too Many Evals
More than 6 and the skill starts gaming them -- it optimizes for passing the test instead of producing good output.

**Fix:** Pick the 3-6 checks that matter most.

### 2. Too Narrow/Rigid
"Must contain exactly 3 bullet points" creates stilted output that technically passes.

**Fix:** Check for qualities you care about, not arbitrary structural constraints.

### 3. Overlapping Evals
If eval 1 is "grammatically correct?" and eval 4 is "spelling errors?" -- these overlap and double-count.

**Fix:** Each eval should test something distinct.

### 4. Unmeasurable by an Agent
"Would a human find this engaging?" -- an agent can't reliably answer this and will say "yes" almost every time.

**Fix:** Translate subjective qualities into observable signals. "Engaging" might mean: "Does the first sentence contain a specific claim, story, or question?"

---

## Eval Template

```
EVAL [N]: [Short name]
Question: [Yes/no question]
Pass: [What "yes" looks like -- one sentence, specific]
Fail: [What triggers "no" -- one sentence, specific]
```

Example:

```
EVAL 1: Text legibility
Question: Is all text fully legible with no truncated, overlapping, or cut-off words?
Pass: Every word is complete and readable without squinting or guessing
Fail: Any word is partially hidden, overlapping another element, or cut off at the edge
```

---

## Score Calculation

```
max_score = [number of evals] x [runs per experiment]
```

Example: 4 evals x 5 runs = max score of 20. Each eval is pass=1, fail=0. Simple sum gives low-variance, comparable scores.
